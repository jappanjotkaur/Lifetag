# backend/utils.py
import os
import csv
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
UPLOAD_DIR = Path(__file__).parent / "uploads"
STATIC_QR_DIR = Path(__file__).parent / "static" / "qr"

# ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
STATIC_QR_DIR.mkdir(parents=True, exist_ok=True)

# file paths
MED_STOCK = UPLOAD_DIR / "medicine_stock.csv"
PRESCRIPTIONS = UPLOAD_DIR / "prescriptions.csv"
SALES = UPLOAD_DIR / "sales.csv"
PATIENTS = UPLOAD_DIR / "patients.csv"
ALERTS = UPLOAD_DIR / "alerts.csv"

def ensure_csv(path, headers):
    if not path.exists() or path.stat().st_size == 0:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)

# ensure CSV headers (patients includes email; alerts extended)
ensure_csv(MED_STOCK, ["product_name","hsn","mrp","batch","exp","qty","manufacturer","rate","gtin","last_update"])
ensure_csv(PRESCRIPTIONS, ["prescription_id","patient_id","doctor_name","pharmacy_id","medications_json","created_at","qr_path","status"])
ensure_csv(SALES, ["sale_id","prescription_id","product_name","batch","qty","sold_at","pharmacy_id"])
ensure_csv(PATIENTS, ["patient_id","name","age","gender","contact","email","notes","registered_at"])
ensure_csv(ALERTS, ["alert_id","product_name","batch","exp","days_to_expiry","alert_type","created_at","last_sent_at","resolved","resolved_by","resolved_at"])

def read_csv_to_df(path):
    """Read CSV to DataFrame safely (strings)."""
    if path.exists() and path.stat().st_size > 0:
        try:
            return pd.read_csv(path, dtype=str).fillna("")
        except Exception:
            return pd.read_csv(path).fillna("")
    return pd.DataFrame()

def write_df_to_csv(df, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    df = df.where(pd.notnull(df), "")
    df.to_csv(path, index=False)

def _try_parse_date(s):
    """Tries common expiry formats and returns datetime.date or raises ValueError."""
    s = str(s).strip()
    if not s:
        raise ValueError("empty")
    fmts = ["%Y-%m-%d", "%d-%m-%Y", "%b-%y", "%b-%Y", "%d-%b-%Y", "%m/%d/%Y", "%Y/%m/%d"]
    for f in fmts:
        try:
            dt = datetime.strptime(s, f)
            if f == "%b-%y" and dt.year < 1970:
                dt = dt.replace(year=dt.year + 100)
            return dt.date()
        except Exception:
            continue
    # fallback for "Aug-26" etc.
    try:
        parts = s.replace("/", "-").replace(" ", "-").split("-")
        if len(parts) >= 2:
            month_token = parts[0]
            year_token = parts[1]
            dt = datetime.strptime(f"{month_token}-{year_token}", "%b-%y")
            if dt.year < 1970:
                dt = dt.replace(year=dt.year + 100)
            return dt.date()
    except Exception:
        pass
    raise ValueError("unrecognized date format: "+s)

# ---------------- existing helpers ----------------

def add_or_update_stock(row_dict):
    """
    Add or update medicine stock.
    - If ALL key fields (product_name, hsn, mrp, batch, exp, manufacturer, rate, gtin)
      match an existing entry -> increment its quantity.
    - If ANY field differs -> create a new separate entry.
    - Handles blank product names, invalid qtys, and corrupted rows gracefully.
    """

    expected_cols = ["product_name", "hsn", "mrp", "batch", "exp", "qty", 
                     "manufacturer", "rate", "gtin", "last_update"]
    df = read_csv_to_df(MED_STOCK)
    if df.empty:
        df = pd.DataFrame(columns=expected_cols)

    # Ensure all required columns exist
    for c in expected_cols:
        if c not in df.columns:
            df[c] = ""

    df = df.fillna("")

    # Normalize incoming record
    incoming = {k: str(row_dict.get(k, "")).strip() for k in expected_cols}

    # Validate and convert qty safely
    try:
        incoming_qty = int(float(row_dict.get("qty", 0) or 0))
    except Exception:
        incoming_qty = 0

    # Skip zero or invalid qty entries
    if incoming_qty <= 0:
        print(f"⚠️ Skipping invalid quantity for batch {incoming.get('batch')}")
        return False

    # Reuse product name if missing and same batch found
    if not incoming["product_name"] and incoming["batch"]:
        same_batch = df[df["batch"] == incoming["batch"]]
        if not same_batch.empty:
            incoming["product_name"] = same_batch.iloc[0]["product_name"]

    # Define all key columns to check for equality
    key_cols = ["product_name", "hsn", "mrp", "batch", "exp", 
                "manufacturer", "rate", "gtin"]

    # Build match mask
    mask = pd.Series(True, index=df.index)
    for c in key_cols:
        mask &= df[c].astype(str).str.strip().str.lower() == incoming[c].lower()

    if mask.any():
        # ✅ Exact match found → increment quantity
        idx = df[mask].index[0]
        try:
            prev_qty = int(float(df.at[idx, "qty"] or 0))
        except Exception:
            prev_qty = 0
        df.at[idx, "qty"] = prev_qty + incoming_qty
        df.at[idx, "last_update"] = datetime.utcnow().isoformat()
        print(f"🔁 Updated existing stock for {incoming['product_name']} batch {incoming['batch']}")
    else:
        # 🆕 New entry → append row
        new_row = incoming.copy()
        new_row["qty"] = incoming_qty
        new_row["last_update"] = datetime.utcnow().isoformat()
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        print(f"➕ Added new stock entry for {incoming['product_name']} batch {incoming['batch']}")

    # Safely write back to CSV
    try:
        write_df_to_csv(df, MED_STOCK)
    except Exception as e:
        print(f"❌ CSV write error: {e}")
        return False

    return True


def create_prescription(patient_id, doctor_name, pharmacy_id, medications):
    pid = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    row = {
        "prescription_id": pid,
        "patient_id": patient_id,
        "doctor_name": doctor_name,
        "pharmacy_id": pharmacy_id,
        "medications_json": json.dumps(medications),
        "created_at": created_at,
        "qr_path": "",
        "status": "created"
    }
    df = read_csv_to_df(PRESCRIPTIONS)
    if df.empty:
        df = pd.DataFrame(columns=list(row.keys()))
    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    write_df_to_csv(df, PRESCRIPTIONS)
    return pid

def get_prescription(pid):
    df = read_csv_to_df(PRESCRIPTIONS)
    if df.empty:
        return None
    rec = df[df['prescription_id'] == pid]
    if rec.empty:
        return None
    row = rec.iloc[0].to_dict()
    row['medications'] = json.loads(row.get('medications_json') or "[]")
    return row

def mark_prescription_qr(pid, qr_path):
    df = read_csv_to_df(PRESCRIPTIONS)
    mask = df['prescription_id'] == pid if not df.empty else pd.Series(dtype=bool)
    if mask.any():
        df.loc[mask, 'qr_path'] = qr_path
        write_df_to_csv(df, PRESCRIPTIONS)
        return True
    return False

def register_patient(patient_info):
    pid = str(uuid.uuid4())
    patient_info = dict(patient_info)
    patient_info.setdefault("email", "")
    patient_info['patient_id'] = pid
    patient_info['registered_at'] = datetime.utcnow().isoformat()
    df = read_csv_to_df(PATIENTS)
    if df.empty:
        df = pd.DataFrame(columns=["patient_id","name","age","gender","contact","email","notes","registered_at"])
    df = pd.concat([df, pd.DataFrame([patient_info])], ignore_index=True)
    write_df_to_csv(df, PATIENTS)
    return pid

def record_sale(prescription_id, product_name, batch, qty, pharmacy_id):
    sale_id = str(uuid.uuid4())
    row = {
        "sale_id": sale_id,
        "prescription_id": prescription_id,
        "product_name": product_name,
        "batch": batch,
        "qty": qty,
        "sold_at": datetime.utcnow().isoformat(),
        "pharmacy_id": pharmacy_id
    }
        # --- After writing the sale record ---
    stock_df = read_csv_to_df(MED_STOCK)
    stock_row = stock_df[stock_df['batch'] == batch]

    if not stock_row.empty:
        exp_str = stock_row.iloc[0]['exp']
        exp_date = datetime.strptime(exp_str, "%b-%y")  # e.g. 'Aug-25'
        days_to_expiry = (exp_date - datetime.now()).days

        # Get prescription info for patient email
        presc_df = read_csv_to_df(PRESCRIPTIONS)
        presc_row = presc_df[presc_df['prescription_id'] == prescription_id]

        if not presc_row.empty:
            patient_id = presc_row.iloc[0]['patient_id']
            patient_df = read_csv_to_df(PATIENTS)
            patient_row = patient_df[patient_df['patient_id'] == patient_id]

            if not patient_row.empty:
                patient_email = patient_row.iloc[0]['email']
                patient_name = patient_row.iloc[0]['name']

                # Check expiry condition
                if days_to_expiry < 0:
                    subject = f"⚠️ Expired Medicine Alert: {product_name}"
                    body = (
                        f"Dear {patient_name},\n\n"
                        f"The medicine '{product_name}' (Batch {batch}) dispensed to you "
                        f"has expired on {exp_str}. Please do not consume it and contact your pharmacist immediately.\n\n"
                        f"– LifeTag System"
                    )
                    send_email(patient_email, subject, body)
                elif days_to_expiry < 30:
                    subject = f"⚠️ Near Expiry Alert: {product_name}"
                    body = (
                        f"Dear {patient_name},\n\n"
                        f"The medicine '{product_name}' (Batch {batch}) you received will expire soon ({exp_str}). "
                        f"Please ensure it is used or replaced before expiry.\n\n"
                        f"– LifeTag System"
                    )
                    send_email(patient_email, subject, body)


def decrement_stock(product_name, batch, qty):
    df = read_csv_to_df(MED_STOCK)
    if df.empty:
        return False, "stock empty"
    df['product_name'] = df['product_name'].astype(str).fillna("")
    df['batch'] = df['batch'].astype(str).fillna("")
    df['exp'] = df['exp'].astype(str).fillna("")
    # Prefer to match product+batch+exp if available; otherwise match product+batch
    mask = (df['product_name'].str.lower() == str(product_name).strip().lower()) & (df['batch'] == str(batch).strip())
    if not mask.any():
        return False, "batch not found"
    idx = df[mask].index[0]
    try:
        current = int(df.at[idx,'qty'] or 0)
    except Exception:
        current = 0
    if current < qty:
        return False, f"not enough stock (have {current})"
    df.at[idx,'qty'] = current - qty
    df.at[idx,'last_update'] = datetime.utcnow().isoformat()
    write_df_to_csv(df, MED_STOCK)
    return True, "ok"

# ---------------- ALERTS logic ----------------

def _alert_exists(alerts_df, product_name, batch, alert_type):
    if alerts_df.empty:
        return False
    pn = str(product_name).strip().lower()
    bt = str(batch).strip()
    exists = (
        (alerts_df['product_name'].astype(str).str.lower() == pn) &
        (alerts_df['batch'].astype(str) == bt) &
        (alerts_df['alert_type'] == alert_type) &
        (alerts_df['resolved'] != "yes")
    )
    return exists.any()

def create_alert_row(product_name, batch, exp_raw, days_to_expiry, alert_type):
    alerts_df = read_csv_to_df(ALERTS)
    if alerts_df.empty:
        alerts_df = pd.DataFrame(columns=["alert_id","product_name","batch","exp","days_to_expiry","alert_type","created_at","last_sent_at","resolved","resolved_by","resolved_at"])
    if _alert_exists(alerts_df, product_name, batch, alert_type):
        return None

    # Safe handling for empty/non-numeric days_to_expiry
    safe_days = ""
    if days_to_expiry not in (None, "", "NaN"):
        try:
            safe_days = str(int(float(days_to_expiry)))
        except Exception:
            safe_days = ""

    row = {
        "alert_id": str(uuid.uuid4()),
        "product_name": product_name,
        "batch": batch,
        "exp": str(exp_raw),
        "days_to_expiry": safe_days,
        "alert_type": alert_type,
        "created_at": datetime.utcnow().isoformat(),
        "last_sent_at": "",
        "resolved": "no",
        "resolved_by": "",
        "resolved_at": ""
    }
    alerts_df = pd.concat([alerts_df, pd.DataFrame([row])], ignore_index=True)
    write_df_to_csv(alerts_df, ALERTS)
    return row

def mark_alert_resolved(alert_id, by_whom="patient"):
    df = read_csv_to_df(ALERTS)
    if df.empty:
        return False
    mask = df['alert_id'] == alert_id
    if not mask.any():
        return False
    df.loc[mask, 'resolved'] = "yes"
    df.loc[mask, 'resolved_by'] = by_whom
    df.loc[mask, 'resolved_at'] = datetime.utcnow().isoformat()
    write_df_to_csv(df, ALERTS)
    return True

def resolve_alerts_for_stock(product_name, batch, by_whom="chemist"):
    """
    Mark any unresolved alerts for this product_name+batch as resolved.
    Useful to call when deleting stock for that batch.
    """
    df = read_csv_to_df(ALERTS)
    if df.empty:
        return 0
    pn = str(product_name).strip().lower()
    bt = str(batch).strip()
    mask = (df['product_name'].astype(str).str.lower() == pn) & (df['batch'].astype(str) == bt) & (df['resolved'] != "yes")
    if not mask.any():
        return 0
    df.loc[mask, 'resolved'] = "yes"
    df.loc[mask, 'resolved_by'] = by_whom
    df.loc[mask, 'resolved_at'] = datetime.utcnow().isoformat()
    write_df_to_csv(df, ALERTS)
    return mask.sum()

def touch_alert_last_sent(alert_id):
    df = read_csv_to_df(ALERTS)
    if df.empty:
        return False
    mask = df['alert_id'] == alert_id
    if not mask.any():
        return False
    df.loc[mask, 'last_sent_at'] = datetime.utcnow().isoformat()
    write_df_to_csv(df, ALERTS)
    return True

def get_active_alerts():
    df = read_csv_to_df(ALERTS)
    if df.empty:
        return []
    df = df[df['resolved'] != "yes"]
    return df.to_dict(orient="records")

def find_patients_for_med(product_name, batch):
    """
    Find patients who were prescribed or dispensed a given medicine batch.
    Uses prescriptions.csv and patients.csv for lookup.
    """
    pres_df = read_csv_to_df(PRESCRIPTIONS)
    pat_df = read_csv_to_df(PATIENTS)
    if pres_df.empty or pat_df.empty:
        return []

    matches = []
    for _, pres in pres_df.iterrows():
        meds = []
        try:
            meds = json.loads(pres.get("medications_json", "[]"))
        except Exception:
            continue

        for m in meds:
            if (
                str(m.get("product_name", "")).strip().lower() == product_name.lower()
                and str(m.get("batch", "")).strip().lower() == batch.lower()
            ):
                pid = pres.get("patient_id")
                p = pat_df[pat_df["patient_id"] == pid]
                if not p.empty:
                    matches.append(p.iloc[0].to_dict())
    return matches


def add_alert(alert_type, message, created_at):
    """Append a new alert row to alerts.csv"""
    try:
        if not os.path.exists(ALERTS):
            df = pd.DataFrame(columns=["alert_type", "message", "created_at"])
        else:
            df = pd.read_csv(ALERTS)

        new_row = pd.DataFrame([{
            "alert_type": alert_type,
            "message": message,
            "created_at": created_at
        }])
        df = pd.concat([df, new_row], ignore_index=True)
        df.to_csv(ALERTS, index=False)
    except Exception as e:
        print(f"Failed to record alert: {e}")

def process_qr_scan(pid, pharmacy_id=None):
    """
    Marks a prescription as dispensed:
      - Updates prescription status to 'dispensed'
      - Deducts quantities from medicine stock
      - Records sale in sales.csv
      - Sends expiry alerts to patient if needed
    """
    pres_df = read_csv_to_df(PRESCRIPTIONS)
    if pres_df.empty:
        return {"error": "no prescriptions found"}

    # Find prescription
    match = pres_df[pres_df['prescription_id'] == pid]
    if match.empty:
        return {"error": "not found"}

    pres = match.iloc[0].to_dict()
    try:
        meds = json.loads(pres.get("medications_json", "[]"))
    except Exception:
        meds = []

    # Deduct each medicine from stock
    for m in meds:
        product_name = str(m.get("product_name", "")).strip()
        batch = str(m.get("batch", "")).strip()
        try:
            qty = int(float(m.get("qty", 1)))
        except Exception:
            qty = 1

        ok, msg = decrement_stock(product_name, batch, qty)
        if ok:
            record_sale(pid, product_name, batch, qty, pharmacy_id or pres.get("pharmacy_id", ""))
        else:
            print(f"⚠️ Could not decrement stock for {product_name} ({msg})")

    # Update prescription status
    pres_df.loc[pres_df['prescription_id'] == pid, 'status'] = "dispensed"
    write_df_to_csv(pres_df, PRESCRIPTIONS)

    # ✅ Check and send expiry alerts to patient
    try:
        alerts_sent = check_dispensed_medicine_and_alert(pid)
        if alerts_sent:
            print(f"✅ Sent {len(alerts_sent)} expiry alerts to patient")
    except Exception as e:
        print(f"❌ Failed to send patient expiry alerts: {e}")

    return {"message": f"Prescription {pid} dispensed successfully"}

def send_email(recipient, subject, body, html=None):
    sender_email = "riyakansal174@gmail.com"
    sender_password = "uwte ykwd lmtv dstu"

    msg = MIMEMultipart('alternative')
    msg["From"] = sender_email
    msg["To"] = recipient
    msg["Subject"] = subject
    
    # Attach plain text
    msg.attach(MIMEText(body, "plain"))
    
    # Attach HTML if provided
    if html:
        msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
        print(f"✅ Email sent to {recipient}")
        return True
    except Exception as e:
        print(f"❌ Email sending failed: {e}")
        return False

def check_expiry_and_create_alerts(days_threshold=15, low_stock_threshold=5):
    """
    Scans MED_STOCK for expiring or low-stock medicines.
    Creates alert entries in alerts.csv (if not already exists).
    Returns list of new alert dicts created.
    """
    stock_df = read_csv_to_df(MED_STOCK)
    if stock_df.empty:
        return []

    alerts_df = read_csv_to_df(ALERTS)
    if alerts_df.empty:
        alerts_df = pd.DataFrame(columns=["alert_id", "product_name", "batch", "alert_type",
                                          "exp", "days_to_expiry", "created_at", "resolved",
                                          "last_sent"])

    new_alerts = []

    from datetime import datetime
    now = datetime.utcnow().date()

    for _, row in stock_df.iterrows():
        product_name = str(row.get("product_name", "")).strip()
        batch = str(row.get("batch", "")).strip()
        exp_raw = str(row.get("exp", "") or row.get("expiry", "")).strip()
        qty = int(row.get("qty", 0) or 0)

        if not product_name or not batch:
            continue

        # Parse expiry safely
        days_left = None
        exp_date = None
        try:
            exp_date = _try_parse_date(exp_raw)
            days_left = (exp_date - now).days
        except Exception:
            continue

        alert_type = None
        if days_left is not None:
            if days_left < 0:
                alert_type = "expired"
            elif days_left <= days_threshold:
                alert_type = "expiring soon"

        if qty <= low_stock_threshold and not alert_type:
            alert_type = "low stock"

        if not alert_type:
            continue

        # Skip duplicates (same product+batch+alert_type not resolved)
        existing = alerts_df[
            (alerts_df["product_name"].str.lower() == product_name.lower()) &
            (alerts_df["batch"].str.lower() == batch.lower()) &
            (alerts_df["alert_type"].str.lower() == alert_type.lower()) &
            (alerts_df["resolved"] != "yes")
        ]
        if not existing.empty:
            continue

        alert_id = str(uuid.uuid4())
        new_alert = {
            "alert_id": alert_id,
            "product_name": product_name,
            "batch": batch,
            "alert_type": alert_type,
            "exp": exp_raw,
            "days_to_expiry": days_left,
            "created_at": datetime.utcnow().isoformat(),
            "resolved": "no",
            "last_sent": ""
        }
        alerts_df = pd.concat([alerts_df, pd.DataFrame([new_alert])], ignore_index=True)
        new_alerts.append(new_alert)

    write_df_to_csv(alerts_df, ALERTS)
    return new_alerts
def check_dispensed_medicine_and_alert(prescription_id):
    """
    Check if any medicine in a dispensed prescription is expired or expiring soon.
    Send email alert to the patient if needed.
    Returns list of alerts sent.
    """
    pres_df = read_csv_to_df(PRESCRIPTIONS)
    if pres_df.empty:
        return []
    
    pres_row = pres_df[pres_df['prescription_id'] == prescription_id]
    if pres_row.empty:
        return []
    
    patient_id = pres_row.iloc[0]['patient_id']
    
    # Get patient details
    pat_df = read_csv_to_df(PATIENTS)
    if pat_df.empty:
        return []
    
    patient_row = pat_df[pat_df['patient_id'] == patient_id]
    if patient_row.empty:
        return []
    
    patient = patient_row.iloc[0].to_dict()
    patient_email = patient.get('email') or patient.get('contact')
    patient_name = patient.get('name', 'Patient')
    
    if not patient_email:
        print(f"⚠️ No email found for patient {patient_id}")
        return []
    
    # Get medications from prescription
    try:
        meds = json.loads(pres_row.iloc[0].get('medications_json', '[]'))
    except Exception:
        return []
    
    alerts_sent = []
    stock_df = read_csv_to_df(MED_STOCK)
    
    for med in meds:
        product_name = str(med.get('product_name', '')).strip()
        batch = str(med.get('batch', '')).strip()
        
        if not product_name or not batch:
            continue
        
        # Find the medicine in stock
        stock_row = stock_df[
            (stock_df['product_name'].str.lower() == product_name.lower()) &
            (stock_df['batch'].str.lower() == batch.lower())
        ]
        
        if stock_row.empty:
            continue
        
        exp_raw = str(stock_row.iloc[0].get('exp', '')).strip()
        if not exp_raw:
            continue
        
        try:
            exp_date = _try_parse_date(exp_raw)
            days_left = (exp_date - datetime.utcnow().date()).days
            
            # If expired or expiring within 15 days
            if days_left <= 15:
                alert_type = "expired" if days_left < 0 else "expiring soon"
                
                # Create alert in database
                create_alert_row(product_name, batch, exp_raw, days_left, alert_type)
                
                # Send email to patient
                subject = f"⚠️ Medicine {alert_type.title()} Alert - {product_name}"
                
                if days_left < 0:
                    body = f"""Dear {patient_name},

URGENT: The medicine '{product_name}' (Batch: {batch}) that was dispensed to you has EXPIRED on {exp_raw}.

⚠️ DO NOT consume this medicine. It expired {abs(days_left)} days ago.

Please contact your pharmacy immediately for a replacement.

Prescription ID: {prescription_id}

Regards,
LifeTag Alert System"""
                    
                    html = f"""<html><body>
<p>Dear <strong>{patient_name}</strong>,</p>
<p style="color: red; font-weight: bold;">URGENT: The medicine '{product_name}' (Batch: {batch}) that was dispensed to you has EXPIRED on {exp_raw}.</p>
<p>⚠️ <strong>DO NOT consume this medicine.</strong> It expired {abs(days_left)} days ago.</p>
<p>Please contact your pharmacy immediately for a replacement.</p>
<p><small>Prescription ID: {prescription_id}</small></p>
<p>Regards,<br><strong>LifeTag Alert System</strong></p>
</body></html>"""
                else:
                    body = f"""Dear {patient_name},

IMPORTANT: The medicine '{product_name}' (Batch: {batch}) that was dispensed to you will expire soon on {exp_raw}.

Days until expiry: {days_left} days

Please use this medicine before the expiry date or contact your pharmacy for guidance.

Prescription ID: {prescription_id}

Regards,
LifeTag Alert System"""
                    
                    html = f"""<html><body>
<p>Dear <strong>{patient_name}</strong>,</p>
<p style="color: orange; font-weight: bold;">IMPORTANT: The medicine '{product_name}' (Batch: {batch}) that was dispensed to you will expire soon on {exp_raw}.</p>
<p><strong>Days until expiry: {days_left} days</strong></p>
<p>Please use this medicine before the expiry date or contact your pharmacy for guidance.</p>
<p><small>Prescription ID: {prescription_id}</small></p>
<p>Regards,<br><strong>LifeTag Alert System</strong></p>
</body></html>"""
                
                try:
                    send_email(patient_email, subject, body, html)
                    alerts_sent.append({
                        'patient': patient_name,
                        'email': patient_email,
                        'medicine': product_name,
                        'batch': batch,
                        'alert_type': alert_type,
                        'days_left': days_left
                    })
                    print(f"✅ Alert email sent to {patient_email} for {product_name} ({alert_type})")
                except Exception as e:
                    print(f"❌ Failed to send email to {patient_email}: {e}")
        
        except Exception as e:
            print(f"⚠️ Error processing medicine {product_name}: {e}")
            continue
    
    return alerts_sent