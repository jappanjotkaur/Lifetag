# backend/app.py (UPDATED)
import os
import uuid
import qrcode
import smtplib
from email.message import EmailMessage
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import json
from utils import (
    add_alert, add_or_update_stock, create_prescription, register_patient, get_prescription,
    decrement_stock, record_sale, check_expiry_and_create_alerts, read_csv_to_df,
    write_df_to_csv, MED_STOCK, PRESCRIPTIONS, PATIENTS, ALERTS,
    find_patients_for_med, get_active_alerts, mark_alert_resolved, touch_alert_last_sent,
    resolve_alerts_for_stock, check_dispensed_medicine_and_alert  # ADD THIS
)
from pathlib import Path
from datetime import datetime
from flask_cors import CORS
import pandas as pd
import cv2
import pytesseract
from apscheduler.schedulers.background import BackgroundScheduler
from urllib.parse import urlencode
from dotenv import load_dotenv
from utils import send_email
from flask import send_file
import io

load_dotenv()  # Load .env configuration

# --- Config ---
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
STATIC_QR_DIR = BASE_DIR / "static" / "qr"
ALLOWED_EXT = {'csv', 'png', 'jpg', 'jpeg'}

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "5000"))

# file paths
MED_STOCK = UPLOAD_DIR / "medicine_stock.csv"
PRESCRIPTIONS = UPLOAD_DIR / "prescriptions.csv"
SALES = UPLOAD_DIR / "sales.csv"
PATIENTS = UPLOAD_DIR / "patients.csv"
ALERTS = UPLOAD_DIR / "alerts.csv"

# Env values (safely parse)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = os.getenv("SMTP_PORT", "")
try:
    SMTP_PORT = int(SMTP_PORT) if SMTP_PORT else 587
except Exception:
    SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL") or SMTP_USER or "lifetag@example.com"
# SITE_BASE fallback to host:port
SITE_BASE = os.getenv("SITE_BASE") or f"http://{HOST}:{PORT}"
PHARMACY_EMAIL = os.getenv("PHARMACY_EMAIL") or FROM_EMAIL
SITE_ADMIN_EMAIL = os.getenv("SITE_ADMIN_EMAIL") or FROM_EMAIL

app = Flask(__name__, static_folder=str(BASE_DIR / "static"), static_url_path="/static")
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins for development
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
STATIC_QR_DIR.mkdir(parents=True, exist_ok=True)

# ---------------- Email Helper ----------------
def send_email(to_email, subject, body_text, html=None):
    if not to_email:
        app.logger.warning("send_email called without recipient")
        return False
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    msg.set_content(body_text)
    if html:
        msg.add_alternative(html, subtype='html')

    # If SMTP configured, attempt send; otherwise print to console for debugging
    if SMTP_HOST and SMTP_USER and SMTP_PASS:
        try:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
                s.starttls()
                s.login(SMTP_USER, SMTP_PASS)
                s.send_message(msg)
            app.logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            app.logger.exception("Failed to send email via SMTP, printing to console")
            print("---- EMAIL FAILED TO SEND (printed) ----")
            print("To:", to_email)
            print("Subject:", subject)
            print(body_text)
            if html:
                print("HTML:", html)
            return False
    else:
        # no SMTP — log/print for local dev
        app.logger.info("SMTP not configured — printing email to console")
        print("---- EMAIL (console) ----")
        print("To:", to_email)
        print("Subject:", subject)
        print(body_text)
        if html:
            print("HTML:", html)
        return True

# ---------------- Helpers ----------------
def build_confirm_link(alert_id, user_type):
    params = {'alert_id': alert_id, 'user': user_type}
    return f"{SITE_BASE.rstrip('/')}/api/resolve_alert?{urlencode(params)}"

def compose_alert_emails(alert_row):
    product = alert_row.get('product_name', '')
    batch = alert_row.get('batch', '')
    exp = alert_row.get('exp', '')
    days = alert_row.get('days_to_expiry', '')
    alert_type = alert_row.get('alert_type', '')

    chem_link = build_confirm_link(alert_row['alert_id'], 'chemist')
    chem_subject = f"⚠️ Inventory alert: {product} (Batch {batch}) — {alert_type}"
    chem_body = f"Inventory alert for {product} (Batch {batch}). Expiry: {exp} ({days} days). Type: {alert_type}.\n\nConfirm removal: {chem_link}"
    chem_html = f"<p>Inventory alert for <strong>{product}</strong> (Batch {batch}).<br>Expiry: {exp} ({days} days).<br>Type: <strong>{alert_type}</strong>.</p><p><a href='{chem_link}'>Mark removed</a></p>"

    emails = [(PHARMACY_EMAIL, chem_subject, chem_body, chem_html)]

    patients = find_patients_for_med(product, batch)
    for p in patients:
        email = (p.get('email') or p.get('contact') or "").strip()
        if not email:
            continue
        link = build_confirm_link(alert_row['alert_id'], 'patient')
        subj = f"⚠️ Medicine expiry alert — {product}"
        body = f"Dear {p.get('name','Patient')}, your medicine {product} (Batch {batch}) is {alert_type}. Expiry: {exp}."
        html = f"<p>Dear {p.get('name','Patient')},</p><p>Your medicine <strong>{product}</strong> (Batch {batch}) is <strong>{alert_type}</strong>. Expiry: {exp}.</p><p><a href='{link}'>I have discarded it</a></p>"
        emails.append((email, subj, body, html))

    if SITE_ADMIN_EMAIL:
        admin_link = build_confirm_link(alert_row['alert_id'], 'admin')
        subj = f"Alert: {product} (Batch {batch}) — {alert_type}"
        body = f"Admin notification: {product} (Batch {batch}) — {alert_type}. Expiry: {exp}."
        html = f"<p>Admin notification for <strong>{product}</strong> (Batch {batch}) — {alert_type}.</p><p><a href='{admin_link}'>Mark resolved</a></p>"
        emails.append((SITE_ADMIN_EMAIL, subj, body, html))

    unique = {}
    out = []
    for to, subj, body, html in emails:
        if to and to not in unique:
            unique[to] = True
            out.append((to, subj, body, html))
    return out

def run_alerts_and_send(days_threshold=15, low_stock_threshold=5):
    """
    Run alert creation for expired/expiring (<= days_threshold) medicines and send emails.
    Default days_threshold is 15 (per your request).
    """
    try:
        created = check_expiry_and_create_alerts(days_threshold=days_threshold, low_stock_threshold=low_stock_threshold)
    except Exception as e:
        app.logger.exception("check_expiry_and_create_alerts failed")
        created = []

    for alert in created:
        try:
            for to, subj, body, html in compose_alert_emails(alert):
                send_email(to, subj, body, html)
            # mark last_sent to avoid duplicate sends
            try:
                touch_alert_last_sent(alert.get('alert_id'))
            except Exception:
                pass
        except Exception:
            app.logger.exception("Failed to compose/send emails for alert: %s", alert)
    return created

# ---------------- Scheduler ----------------
def start_scheduler():
    scheduler = BackgroundScheduler()
    # run every 24 hours; start immediately on launch as next_run_time
    scheduler.add_job(lambda: run_alerts_and_send(days_threshold=15, low_stock_threshold=5), 'interval', hours=24, next_run_time=datetime.utcnow())
    scheduler.start()
    app.logger.info("Background scheduler started for alerts (24h interval).")

start_scheduler()

# ---------------- Upload Bill ----------------
@app.route("/api/upload_bill", methods=['POST'])
def upload_bill():
    if 'file' not in request.files:
        return jsonify({"error": "no file"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "empty filename"}), 400

    filename = secure_filename(file.filename)
    dest = UPLOAD_DIR / filename
    file.save(dest)
    ext = filename.rsplit(".", 1)[1].lower()

    created = []
    try:
        if ext == "csv":
            # safe read CSV, tolerate weird headers/extra columns
            df = pd.read_csv(dest, dtype=str, on_bad_lines='skip').fillna("")
            # normalize header names to lowercase
            df.columns = [c.strip().lower() for c in df.columns]

            for _, r in df.iterrows():
                # attempt to find product name from common headers
                prod = ""
                for c in ['product name', 'product', 'medicine name', 'name', 'item', 'sr', 'description']:
                    if c in df.columns and str(r.get(c, "")).strip():
                        prod = r.get(c, "")
                        break

                # If no product name and batch exists, allow utils.add_or_update_stock to try fill using batch
                batch = ""
                for c in ['batch', 'batch no', 'batch number']:
                    if c in df.columns:
                        batch = r.get(c, "")
                        break

                exp = ""
                for c in ['exp', 'exp.', 'expiry', 'expiry date', 'exp date', 'exp_dt']:
                    if c in df.columns:
                        exp = r.get(c, "")
                        break

                # quantity detection with fallback columns
                qty = 0
                for c in ['qty', 'quantity', 'qnty', 'q', 'QTY']:
                    if c in df.columns and str(r.get(c, "")).strip():
                        try:
                            qty = int(float(r.get(c, 0) or 0))
                        except:
                            qty = 0
                        break

                if not prod and not batch:
                    # nothing meaningful in this row — skip it
                    continue

                obj = {
                    "product_name": str(prod).strip(),
                    "hsn": str(r.get('hsn', "")).strip() if 'hsn' in df.columns else "",
                    "mrp": str(r.get('mrp', "")).strip() if 'mrp' in df.columns else "",
                    "batch": str(batch).strip(),
                    "exp": str(exp).strip(),
                    "qty": int(qty),
                    "manufacturer": str(r.get('manufacturer', "")).strip() if 'manufacturer' in df.columns else "",
                    "rate": str(r.get('rate', "")).strip() if 'rate' in df.columns else "",
                    "gtin": str(r.get('gtin', "")).strip() if 'gtin' in df.columns else ""
                }
                try:
                    add_or_update_stock(obj)
                    created.append(obj)
                except Exception:
                    app.logger.exception("add_or_update_stock failed for row: %s", obj)
                    # continue with next row rather than fail whole upload

            # after upload we may want to immediately create alerts for newly added stock
            run_alerts_and_send(days_threshold=15, low_stock_threshold=5)
            return jsonify({"status": "ok", "imported": len(created)})

        else:
            # OCR path for images (best-effort)
            img = cv2.imread(str(dest))
            if img is None:
                return jsonify({"error": "image_read_failed"}), 400
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            text = pytesseract.image_to_string(gray)
            # keep simple: return extracted text to client for inspection
            return jsonify({"status": "ok", "text": text, "note": "OCR best-effort"})
    except Exception as e:
        app.logger.exception("upload_bill handler failed")
        return jsonify({"error": "upload_failed", "detail": str(e)}), 500

# ---------------- Inventory ----------------
@app.route("/api/inventory", methods=['GET'])
def inventory():
    df = read_csv_to_df(MED_STOCK)
    if df.empty:
        return jsonify([])
    from utils import _try_parse_date
    out = df.to_dict(orient="records")
    for r in out:
        exp = str(r.get('exp', '')).strip()
        r['expired'] = False
        try:
            if exp:
                parsed = _try_parse_date(exp)
                r['days_to_expiry'] = (parsed - datetime.utcnow().date()).days
                r['expired'] = r['days_to_expiry'] < 0
            else:
                r['days_to_expiry'] = None
        except Exception:
            r['days_to_expiry'] = None
    return out

# ---------------- Alerts ----------------
@app.route("/api/alerts", methods=['GET'])
def alerts():
    # Create and send any new alerts then return active (unresolved) alerts
    run_alerts_and_send(days_threshold=15, low_stock_threshold=5)
    df = read_csv_to_df(ALERTS)
    if df.empty:
        return jsonify([])
    df = df[df['resolved'] != "yes"]
    return df.to_dict(orient="records")

@app.route("/api/resolve_alert", methods=['GET'])
def resolve_alert():
    alert_id = request.args.get('alert_id')
    user = request.args.get('user', 'patient')
    if not alert_id:
        return jsonify({"error": "alert_id required"}), 400
    ok = mark_alert_resolved(alert_id, by_whom=user)
    if ok:
        return f"<h3>Thank you — alert {alert_id} marked resolved by {user}.</h3>"
    return "<h3>Unable to mark alert (not found).</h3>", 404

# ---------------- Delete Stock ----------------
@app.route("/api/delete_stock", methods=['POST'])
def delete_stock():
    body = request.get_json(force=True)
    product_name = (body.get('product_name') or "").strip()
    batch = (body.get('batch') or "").strip()

    if not product_name and not batch:
        return jsonify({"error": "At least product_name or batch required"}), 400

    df = read_csv_to_df(MED_STOCK)
    if df.empty:
        return jsonify({"error": "no stock"}), 400

    df['product_name'] = df['product_name'].astype(str).fillna("")
    df['batch'] = df['batch'].astype(str).fillna("")

    # support deletion by (product+batch) OR batch-only OR product-only
    if product_name and batch:
        mask = ~((df['product_name'].str.lower() == product_name.lower()) &
                 (df['batch'].str.lower() == batch.lower()))
    elif batch:
        mask = ~(df['batch'].str.lower() == batch.lower())
    else:
        mask = ~(df['product_name'].str.lower() == product_name.lower())

    new_df = df[mask]
    write_df_to_csv(new_df, MED_STOCK)

    # resolve any outstanding alerts for the removed stock
    try:
        resolved_count = resolve_alerts_for_stock(product_name, batch, by_whom="chemist")
    except Exception:
        app.logger.exception("resolve_alerts_for_stock failed")
        resolved_count = 0

    return jsonify({
        "status": "deleted",
        "alerts_resolved": int(resolved_count),
        "note": "Handled blank product_name/batch safely"
    })

# ---------------- Register & Get Patients ----------------
@app.route("/api/register_patient", methods=['POST'])
def api_register_patient():
    body = request.get_json(force=True)
    required = ['name', 'age', 'gender', 'contact']
    for r in required:
        if r not in body:
            return jsonify({"error": f"{r} missing"}), 400

    # Allow optional email field
    patient_data = {
        "name": body.get("name"),
        "age": body.get("age"),
        "gender": body.get("gender"),
        "contact": body.get("contact"),
        "email": body.get("email", body.get("contact"))  # fallback if no email given
    }

    pid = register_patient(patient_data)
    return jsonify({"status": "ok", "patient_id": pid})

@app.route("/api/patients", methods=['GET'])
def api_patients():
    df = read_csv_to_df(PATIENTS)
    if df.empty:
        return jsonify([])
    return df.to_dict(orient="records")

# ---------------- Prescription Handling ----------------
@app.route("/api/create_prescription", methods=['POST'])
def api_create_prescription():
    body = request.get_json(force=True)
    if 'patient_id' not in body or 'doctor_name' not in body or 'medications' not in body:
        return jsonify({"error": "patient_id, doctor_name, medications required"}), 400

    provided_pid = body.get('prescription_id')
    if provided_pid:
        # if front-end provided an ID, ensure no duplicate
        pid = provided_pid
        existing = read_csv_to_df(PRESCRIPTIONS)
        if not existing.empty and (existing['prescription_id'] == pid).any():
            return jsonify({"error": "prescription_id already exists"}), 400
        # append row
        created_at = datetime.utcnow().isoformat()
        row = {
            "prescription_id": pid,
            "patient_id": body['patient_id'],
            "doctor_name": body['doctor_name'],
            "pharmacy_id": body.get('pharmacy_id', 'pharmacy_demo'),
            "medications_json": json.dumps(body['medications']),
            "created_at": created_at,
            "qr_path": "",
            "status": "created"
        }
        df = read_csv_to_df(PRESCRIPTIONS)
        if df.empty:
            df = pd.DataFrame(columns=list(row.keys()))
        df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
        write_df_to_csv(df, PRESCRIPTIONS)
    else:
        pid = create_prescription(body['patient_id'], body['doctor_name'], body.get('pharmacy_id', 'pharmacy_demo'), body['medications'])

    # generate QR using SITE_BASE so links are correct
    view_url = f"{SITE_BASE.rstrip('/')}/prescription/{pid}"
    img = qrcode.make(view_url)
    out_file = STATIC_QR_DIR / f"{pid}.png"
    img.save(out_file)

    # update prescriptions.csv qr_path
    df = read_csv_to_df(PRESCRIPTIONS)
    if not df.empty and ('prescription_id' in df.columns):
        mask = df['prescription_id'] == pid
        if mask.any():
            df.loc[mask, 'qr_path'] = str(out_file.name)
            write_df_to_csv(df, PRESCRIPTIONS)

    # create alerts so doctor/chemist views are updated
    run_alerts_and_send(days_threshold=15, low_stock_threshold=5)

    return jsonify({"status": "ok", "prescription_id": pid, "qr_path": f"/static/qr/{out_file.name}"})

@app.route("/api/prescription/<pid>", methods=['GET'])
def api_get_prescription(pid):
    p = get_prescription(pid)
    if not p:
        return jsonify({"error": "not found"}), 404
    return jsonify(p)

# Serve QR using the path your frontend expects (some places expect /qrcodes/)
@app.route("/qrcodes/<path:filename>")
def serve_qrcode_alias(filename):
    return send_from_directory(str(STATIC_QR_DIR), filename)

@app.route("/api/scan_qr", methods=["POST"])
def scan_qr():
    from utils import process_qr_scan
    data = request.get_json()
    pid = data.get("prescription_id")
    pharmacy = data.get("pharmacy_id")

    if not pid:
        return jsonify({"error": "missing prescription id"}), 400

    result = process_qr_scan(pid, pharmacy)
    if "error" in result:
        return jsonify(result), 404
    
    # ✅ NEW: Send expiry alerts to patient after dispensing
    try:
        alerts_sent = check_dispensed_medicine_and_alert(pid)
        result['patient_alerts_sent'] = len(alerts_sent)
        if alerts_sent:
            app.logger.info(f"Sent {len(alerts_sent)} expiry alerts to patient for prescription {pid}")
    except Exception as e:
        app.logger.exception(f"Failed to send patient alerts: {e}")
        result['patient_alerts_sent'] = 0
    
    return jsonify(result), 200

# existing static QR route
@app.route("/static/qr/<path:filename>")
def serve_qr(filename):
    return send_from_directory(str(STATIC_QR_DIR), filename)

@app.route("/api/dispense", methods=["POST"])
def dispense_prescription():
    data = request.get_json()
    prescription_id = data.get("prescription_id")
    dispensed_items = data.get("items", [])

    # Load necessary CSVs
    med_df = pd.read_csv(MED_STOCK)
    sales_df = pd.read_csv(SALES)
    prescriptions_df = pd.read_csv(PRESCRIPTIONS)

    new_sales = []

    for item in dispensed_items:
        product_name = item.get("product_name")
        batch = item.get("batch")
        qty = int(item.get("qty", 0))
        sold_at = datetime.now().isoformat()

        # --- Update stock ---
        med_idx = med_df[
            (med_df["product_name"] == product_name) &
            (med_df["batch"] == batch)
        ].index

        if not med_idx.empty:
            current_qty = med_df.loc[med_idx[0], "qty"]
            med_df.loc[med_idx[0], "qty"] = max(0, current_qty - qty)
        else:
            print(f"⚠️ Batch {batch} not found in stock for {product_name}")

        # --- Add to sales CSV ---
        sale_id = str(uuid.uuid4())
        new_sales.append({
            "sale_id": sale_id,
            "prescription_id": prescription_id,
            "product_name": product_name,
            "batch": batch,
            "qty": qty,
            "sold_at": sold_at,
            "pharmacy_id": "PHARM001"
        })

    # --- Save updated stock & sales ---
    med_df.to_csv(MED_STOCK, index=False)
    sales_df = pd.concat([sales_df, pd.DataFrame(new_sales)], ignore_index=True)
    sales_df.to_csv(SALES, index=False)

    # ✅ NEW: Check and send expiry alerts to patient
    alerts_sent = []
    try:
        from utils import check_dispensed_medicine_and_alert
        alerts_sent = check_dispensed_medicine_and_alert(prescription_id)
        if alerts_sent:
            app.logger.info(f"Sent {len(alerts_sent)} expiry alerts to patient")
            print(f"✅ Sent {len(alerts_sent)} expiry alerts to patient for prescription {prescription_id}")
    except Exception as e:
        app.logger.exception(f"Failed to send patient alerts: {e}")
        print(f"❌ Failed to send patient alerts: {e}")

    return jsonify({
        "status": "success",
        "patient_alerts_sent": len(alerts_sent)
    })

@app.route("/api/trigger-alerts", methods=['POST'])
def trigger_expiry_alerts():
    """
    Trigger expiry alert checks manually (similar to the test script logic).
    Checks medicine_stock.csv and sends email to patients if expired/expiring.
    """
    try:
        stock_df = read_csv_to_df(MED_STOCK)
        patient_df = read_csv_to_df(PATIENTS)
        if stock_df.empty:
            return jsonify({"error": "No stock data"}), 400

        threshold_days = 15
        alerts_created = []
        email_logs = []

        for _, row in stock_df.iterrows():
            product_name = row.get("product_name")
            batch = row.get("batch")
            exp_raw = row.get("expiry") or row.get("Exp")
            if not exp_raw:
                continue

            try:
                expiry_date = datetime.strptime(exp_raw, "%b-%y")
                days_left = (expiry_date - datetime.now()).days
            except Exception:
                continue

            if days_left <= threshold_days:
                status = "expired" if days_left < 0 else "expiring_soon"

                alert_msg = f"{product_name} (Batch {batch}) is {status.replace('_', ' ')}."
                alerts_created.append(alert_msg)

                # Log in alerts.csv
                add_alert(alert_type="expiry", message=alert_msg, created_at=datetime.now().isoformat())

                # Send email to all patients (simplified broadcast alert)
                for _, p_row in patient_df.iterrows():
                    patient_email = p_row.get("email") or p_row.get("contact")
                    patient_name = p_row.get("name", "Patient")
                    if not patient_email:
                        continue

                    subject = f"⚠️ Medicine {status.title()} Alert"
                    text = (
                        f"Dear {patient_name},\n\n"
                        f"The medicine '{product_name}' (Batch {batch}) is {status.replace('_', ' ')}.\n"
                        f"Please contact your pharmacist for assistance.\n\n"
                        f"Regards,\nLifeTag Team"
                    )
                    html = f"<p>Dear {patient_name},</p><p>The medicine <b>{product_name}</b> (Batch {batch}) is {status.replace('_', ' ')}.</p><p>Regards,<br><b>LifeTag Team</b></p>"

                    ok = send_email(patient_email, subject, text, html)
                    email_logs.append({"email": patient_email, "status": ok, "medicine": product_name})

        return jsonify({
            "success": True,
            "message": f"{len(alerts_created)} alerts processed.",
            "alerts_created": alerts_created,
            "emails_sent": email_logs
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/analytics", methods=['GET'])
def get_analytics():
    """
    Returns comprehensive analytics data for the dashboard
    """
    try:
        time_range = request.args.get('range', 'month')  # week, month, year
        
        # Read all CSVs
        stock_df = read_csv_to_df(MED_STOCK)
        sales_df = read_csv_to_df(SALES)
        patients_df = read_csv_to_df(PATIENTS)
        prescriptions_df = read_csv_to_df(PRESCRIPTIONS)
        
        # Calculate metrics
        total_medicines = len(stock_df) if not stock_df.empty else 0
        
        # Expiring medicines
        expiring_soon = 0
        expired = 0
        low_stock_items = 0
        stock_value = 0
        
        if not stock_df.empty:
            from utils import _try_parse_date
            for _, row in stock_df.iterrows():
                # Check expiry
                exp_raw = str(row.get('exp', '')).strip()
                if exp_raw:
                    try:
                        exp_date = _try_parse_date(exp_raw)
                        days_left = (exp_date - datetime.utcnow().date()).days
                        if days_left < 0:
                            expired += 1
                        elif days_left <= 15:
                            expiring_soon += 1
                    except Exception:
                        pass
                
                # Check low stock
                try:
                    qty = int(float(row.get('qty', 0) or 0))
                    if qty < 10:
                        low_stock_items += 1
                    
                    # Calculate stock value
                    mrp = float(row.get('mrp', 0) or 0)
                    stock_value += qty * mrp
                except Exception:
                    pass
        
        # Total patients
        total_patients = len(patients_df) if not patients_df.empty else 0
        
        # Prescriptions dispensed
        prescriptions_dispensed = 0
        if not prescriptions_df.empty:
            prescriptions_dispensed = len(prescriptions_df[prescriptions_df['status'] == 'dispensed'])
        
        # Total sales
        total_sales = len(sales_df) if not sales_df.empty else 0
        
        # Calculate revenue
        revenue = 0
        if not sales_df.empty:
            for _, sale in sales_df.iterrows():
                product_name = sale.get('product_name')
                batch = sale.get('batch')
                qty_sold = int(float(sale.get('qty', 0) or 0))
                
                # Find product in stock to get MRP
                if not stock_df.empty:
                    product = stock_df[
                        (stock_df['product_name'].str.lower() == str(product_name).lower()) &
                        (stock_df['batch'] == str(batch))
                    ]
                    if not product.empty:
                        mrp = float(product.iloc[0].get('mrp', 0) or 0)
                        revenue += qty_sold * mrp
        
        # Top selling medicines
        top_medicines = []
        if not sales_df.empty:
            sales_by_product = sales_df.groupby('product_name').agg({
                'qty': 'sum'
            }).reset_index()
            sales_by_product['qty'] = sales_by_product['qty'].astype(int)
            sales_by_product = sales_by_product.sort_values('qty', ascending=False).head(5)
            
            for _, row in sales_by_product.iterrows():
                product_name = row['product_name']
                sales_count = int(row['qty'])
                
                # Calculate revenue for this product
                product_revenue = 0
                if not stock_df.empty:
                    product = stock_df[stock_df['product_name'].str.lower() == str(product_name).lower()]
                    if not product.empty:
                        mrp = float(product.iloc[0].get('mrp', 0) or 0)
                        product_revenue = sales_count * mrp
                
                top_medicines.append({
                    'name': product_name,
                    'sales': sales_count,
                    'revenue': int(product_revenue)
                })
        
        # Monthly sales (last 6 months)
        monthly_sales = []
        if not sales_df.empty and 'sold_at' in sales_df.columns:
            sales_df['sold_at'] = pd.to_datetime(sales_df['sold_at'], errors='coerce')
            sales_df = sales_df.dropna(subset=['sold_at'])
            
            # Group by month
            sales_df['month'] = sales_df['sold_at'].dt.strftime('%b')
            monthly_counts = sales_df.groupby('month').size().to_dict()
            
            # Last 6 months
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            current_month = datetime.utcnow().month
            
            for i in range(6):
                month_idx = (current_month - 6 + i) % 12
                month_name = months[month_idx]
                monthly_sales.append({
                    'month': month_name,
                    'sales': monthly_counts.get(month_name, 0)
                })
        
        return jsonify({
            'total_medicines': total_medicines,
            'expiring_soon': expiring_soon,
            'expired': expired,
            'low_stock_items': low_stock_items,
            'total_sales': total_sales,
            'total_patients': total_patients,
            'prescriptions_dispensed': prescriptions_dispensed,
            'revenue': int(revenue),
            'stock_value': int(stock_value),
            'top_medicines': top_medicines,
            'monthly_sales': monthly_sales
        })
        
    except Exception as e:
        app.logger.exception("Analytics endpoint failed")
        return jsonify({'error': str(e)}), 500

# ADD THESE IMPORTS AT THE TOP
from flask import send_file
import io

# ============ NEW ENDPOINTS FOR FLUTTER APP ============

@app.route("/api/prescriptions", methods=['GET'])
def get_all_prescriptions():
    """Get all prescriptions (for patient app to filter by patient_id)"""
    df = read_csv_to_df(PRESCRIPTIONS)
    if df.empty:
        return jsonify([])
    
    results = []
    for _, row in df.iterrows():
        prescription = row.to_dict()
        # Parse medications_json if it's a string
        if 'medications_json' in prescription and prescription['medications_json']:
            try:
                prescription['medications'] = json.loads(prescription['medications_json'])
            except:
                prescription['medications'] = []
        results.append(prescription)
    
    return jsonify(results)

@app.route("/api/patient/<patient_id>/prescriptions", methods=['GET'])
def get_patient_prescriptions(patient_id):
    """Get all prescriptions for a specific patient"""
    df = read_csv_to_df(PRESCRIPTIONS)
    if df.empty:
        return jsonify([])
    
    patient_prescriptions = df[df['patient_id'] == patient_id]
    
    results = []
    for _, row in patient_prescriptions.iterrows():
        prescription = row.to_dict()
        if 'medications_json' in prescription and prescription['medications_json']:
            try:
                prescription['medications'] = json.loads(prescription['medications_json'])
            except:
                prescription['medications'] = []
        results.append(prescription)
    
    return jsonify(results)

@app.route("/api/patient/<patient_id>", methods=['GET'])
def get_patient_by_id(patient_id):
    """Get patient details by ID"""
    df = read_csv_to_df(PATIENTS)
    if df.empty:
        return jsonify({"error": "No patients found"}), 404
    
    patient = df[df['patient_id'] == patient_id]
    if patient.empty:
        return jsonify({"error": "Patient not found"}), 404
    
    return jsonify(patient.iloc[0].to_dict())

@app.route("/api/patient/<patient_id>/alerts", methods=['GET'])
def get_patient_alerts(patient_id):
    """
    Get alerts relevant to a specific patient based on their prescriptions.
    Checks if any medicine in their prescriptions is expired/expiring.
    """
    try:
        # Get patient's prescriptions
        pres_df = read_csv_to_df(PRESCRIPTIONS)
        if pres_df.empty:
            return jsonify([])
        
        patient_prescriptions = pres_df[pres_df['patient_id'] == patient_id]
        if patient_prescriptions.empty:
            return jsonify([])
        
        # Collect all medicine batches for this patient
        patient_batches = set()
        for _, pres in patient_prescriptions.iterrows():
            try:
                meds = json.loads(pres.get('medications_json', '[]'))
                for med in meds:
                    batch = med.get('batch', '').strip()
                    if batch:
                        patient_batches.add(batch.lower())
            except:
                continue
        
        # Get alerts for these batches
        alerts_df = read_csv_to_df(ALERTS)
        if alerts_df.empty:
            return jsonify([])
        
        # Filter alerts for patient's medicines (unresolved only)
        patient_alerts = alerts_df[
            (alerts_df['batch'].str.lower().isin(patient_batches)) &
            (alerts_df['resolved'] != 'yes')
        ]
        
        return jsonify(patient_alerts.to_dict(orient='records'))
    
    except Exception as e:
        app.logger.exception("Error getting patient alerts")
        return jsonify({"error": str(e)}), 500

@app.route("/api/medicine/search", methods=['GET'])
def search_medicine():
    """Search medicine by name (for medicine information feature)"""
    query = request.args.get('q', '').strip().lower()
    if not query:
        return jsonify([])
    
    df = read_csv_to_df(MED_STOCK)
    if df.empty:
        return jsonify([])
    
    # Search in product name
    results = df[df['product_name'].str.lower().str.contains(query, na=False)]
    
    return jsonify(results.to_dict(orient='records'))

@app.route("/api/medicine/<batch>/info", methods=['GET'])
def get_medicine_info(batch):
    """Get detailed information about a specific medicine batch"""
    df = read_csv_to_df(MED_STOCK)
    if df.empty:
        return jsonify({"error": "No inventory"}), 404
    
    medicine = df[df['batch'].str.lower() == batch.lower()]
    if medicine.empty:
        return jsonify({"error": "Medicine not found"}), 404
    
    return jsonify(medicine.iloc[0].to_dict())

@app.route("/api/patient/<patient_id>/medicine-history", methods=['GET'])
def get_patient_medicine_history(patient_id):
    """Get patient's medicine dispensing history"""
    try:
        # Get patient's prescriptions
        pres_df = read_csv_to_df(PRESCRIPTIONS)
        if pres_df.empty:
            return jsonify([])
        
        patient_prescriptions = pres_df[pres_df['patient_id'] == patient_id]
        
        history = []
        for _, pres in patient_prescriptions.iterrows():
            try:
                meds = json.loads(pres.get('medications_json', '[]'))
                history.append({
                    'prescription_id': pres.get('prescription_id'),
                    'doctor_name': pres.get('doctor_name'),
                    'created_at': pres.get('created_at'),
                    'status': pres.get('status'),
                    'medications': meds
                })
            except:
                continue
        
        return jsonify(history)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/health-check", methods=['GET'])
def health_check():
    """Simple health check endpoint for Flutter app"""
    return jsonify({
        "status": "ok",
        "message": "LifeTag Backend is running",
        "timestamp": datetime.utcnow().isoformat()
    })

# ============ QR CODE IMAGE SERVING ============

@app.route("/api/qr/<prescription_id>.png", methods=['GET'])
def serve_qr_image(prescription_id):
    """Serve QR code image directly"""
    qr_file = STATIC_QR_DIR / f"{prescription_id}.png"
    if qr_file.exists():
        return send_file(str(qr_file), mimetype='image/png')
    return jsonify({"error": "QR code not found"}), 404

if __name__ == "__main__":
    app.run(host=HOST, port=PORT, debug=True)
