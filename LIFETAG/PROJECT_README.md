# LifeTag — Project Summary (Core Logic)

This file highlights the main architecture and the core code paths so an engineer or AI agent can be quickly productive.

**Big Picture**
- Backend: CSV-based lightweight datastore under `lifetag-prototype/backend/uploads/` (files: `medicine_stock.csv`, `prescriptions.csv`, `patients.csv`, `alerts.csv`, `sales.csv`). The Flask app is `lifetag-prototype/backend/app.py`. Business logic and CSV helpers live in `lifetag-prototype/backend/utils.py`.
- Frontend: React single-page app in `lifetag-prototype/web_dashboard/` that calls backend APIs at `http://localhost:5000/api` via `src/services/api.js`.
- QR & Alerts: Prescriptions get a QR (`/api/create_prescription`) stored under `backend/static/qr/`. A background scheduler (APS) runs `check_expiry_and_create_alerts` daily to create alerts and trigger email sends.

**Data flow / Service boundaries**
- Upload CSV bills -> `POST /api/upload_bill` (backend parses CSV, calls `add_or_update_stock` in `utils.py`).
- Prescription creation -> `POST /api/create_prescription` (writes to `prescriptions.csv`, generates QR image, returns `qr_path`).
- Dispense / QR scan -> `POST /api/scan_qr` (calls `process_qr_scan` in `utils.py`, decrements stock, records sale, may trigger patient expiry emails via `check_dispensed_medicine_and_alert`).
- Alerts listing -> `GET /api/alerts` (creates/sends new alerts then returns unresolved). Patients can confirm via `/api/resolve_alert`.

**Core files to inspect (quick references)**
- `lifetag-prototype/backend/app.py` — main Flask app: endpoints, scheduler start, QR serving (`/qrcodes/*`, `/api/qr/<id>.png`). Key functions: `run_alerts_and_send`, `upload_bill`, `inventory`, `create_prescription`, `scan_qr`, `dispense_prescription`, `get_analytics`.
- `lifetag-prototype/backend/utils.py` — CSV helpers + main business logic: `read_csv_to_df`, `write_df_to_csv`, `_try_parse_date`, `add_or_update_stock`, `create_prescription`, `get_prescription`, `decrement_stock`, `record_sale`, `process_qr_scan`, `check_expiry_and_create_alerts`, `check_dispensed_medicine_and_alert`, `create_alert_row`, `mark_alert_resolved`.
- `lifetag-prototype/backend/generate_prescription_qr.py` — helper to create QR images and write a prescription row (used by some offline flows).
- `lifetag-prototype/web_dashboard/src/services/api.js` — frontend ↔ backend API endpoints (upload, inventory, patients, prescriptions, scan_qr, delete_stock).
- `lifetag-prototype/web_dashboard/src/pages/CreatePrescription.js` — front-end prescription creation UI; creates payload similar to backend `create_prescription` expectations.

**Important project-specific conventions & patterns**
- CSV-first "DB": All persistent state is CSV files in `backend/uploads/`. Treat CSV reads/writes as the central consistency point — `utils.read_csv_to_df` and `utils.write_df_to_csv` are the canonical accessors.
- Dates: expiry strings use multiple formats. The parser `_try_parse_date` tries formats like `%Y-%m-%d`, `%d-%m-%Y`, `%b-%y` (e.g., `Aug-25`). When adding or matching expiry dates, code expects `exp` column and attempts to parse robustly.
- Matching stock: `add_or_update_stock` treats these columns as keys: `product_name, hsn, mrp, batch, exp, manufacturer, rate, gtin`. If all match, it increments quantity; otherwise it appends a new row.
- Alerts lifecycle: alerts are rows in `alerts.csv` with `resolved` flag. Many endpoints call `run_alerts_and_send(...)` after stock changes to keep UI consistent.
- Email sending: two layers exist — `backend/app.py` has `send_email` (SMTP optional, falls back to console logging); `utils.send_email` exists for some helper paths. Environment variables (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `SITE_BASE`) control SMTP and generated links.

**External integrations**
- SMTP for sending emails (configured with env vars). If not configured, the app prints emails to console.
- OCR path for image bill upload uses `pytesseract` + OpenCV (`cv2`) as a fallback when uploading non-CSV bills.

**Run / dev workflows**
- Backend (recommended in a Python venv):

  PowerShell example (from repository root):

  ```powershell
  # activate your venv
  & .venv\\Scripts\\Activate.ps1
  cd .\\lifetag-prototype\\backend
  pip install flask pandas qrcode pillow apscheduler python-dotenv flask-cors pytesseract opencv-python
  python app.py
  ```

  Notes:
  - `backend/requirements.txt` is currently empty; above is the minimal install list inferred from imports.
  - Ensure Tesseract OCR is installed on the machine if you plan to use image OCR.

- Frontend (React):

  ```powershell
  cd .\\lifetag-prototype\\web_dashboard
  npm install
  npm start
  ```
  The front-end expects the backend at `http://localhost:5000` (see `src/services/api.js`).

**Key API examples (short)**
- Create prescription (from frontend):

  POST `http://localhost:5000/api/create_prescription`
  JSON payload:
  ```json
  {
    "prescription_id": "RX167...",
    "patient_id": "<uuid>",
    "doctor_name": "Dr. Demo",
    "pharmacy_id": "pharmacy_demo",
    "medications": [{"product_name":"Paracetamol","batch":"B123","qty":2}]
  }
  ```

- Upload bill (CSV):

  ```bash
  curl -F "file=@/path/to/bill.csv" http://localhost:5000/api/upload_bill
  ```

- Scan QR / dispense (backend will decrement):

  POST `http://localhost:5000/api/scan_qr`
  JSON payload: `{ "prescription_id": "RX...", "pharmacy_id": "PHARM001" }`

**Where to look for logic when editing**
- Inventory & CSV parsing: `backend/app.py:upload_bill` and `backend/utils.py:add_or_update_stock`
- Alerts: `backend/utils.py:check_expiry_and_create_alerts` + `backend/app.py:run_alerts_and_send` + scheduler created in `start_scheduler()`
- Prescription lifecycle: `backend/app.py:api_create_prescription`, `backend/utils.py:create_prescription`, `backend/utils.py:process_qr_scan`, and QR image serving routes in `app.py`.

**Quick troubleshooting hints**
- If QR isn't visible: check `lifetag-prototype/backend/static/qr/<id>.png` exists; frontend uses `http://localhost:5000/qrcodes/<id>.png` or `/static/qr/<id>.png`.
- If emails don't send: confirm SMTP env vars and credentials. Otherwise check console logs for printed email bodies.
- If parsing fails for expiry dates: review `_try_parse_date` in `utils.py` and update supported formats.

**Key Code Snippets (short, central logic)**

Below are trimmed excerpts of the main functions. For correctness and full behaviour, inspect the full implementations in `lifetag-prototype/backend/utils.py` and `lifetag-prototype/backend/app.py`.

```python
# add_or_update_stock (core inventory write)
def add_or_update_stock(row):
    df = read_csv_to_df(MED_STOCK)
    # normalize and validate qty
    incoming_qty = int(float(row.get('qty', 0) or 0))
    if incoming_qty <= 0:
        return False
    # match by key columns; if found increment qty otherwise append
    # key: product_name, hsn, mrp, batch, exp, manufacturer, rate, gtin
    # ...update last_update and write back
    write_df_to_csv(df, MED_STOCK)
    return True
```

```python
# check_expiry_and_create_alerts (runs daily via APScheduler)
def check_expiry_and_create_alerts(days_threshold=15, low_stock_threshold=5):
    stock_df = read_csv_to_df(MED_STOCK)
    new_alerts = []
    for _, r in stock_df.iterrows():
        days_left = (_try_parse_date(r.get('exp')) - datetime.utcnow().date()).days
        alert_type = None
        if days_left < 0:
            alert_type = 'expired'
        elif days_left <= days_threshold:
            alert_type = 'expiring soon'
        if int(r.get('qty',0)) <= low_stock_threshold and not alert_type:
            alert_type = 'low stock'
        if alert_type:
            create_alert_row(r['product_name'], r['batch'], r['exp'], days_left, alert_type)
            new_alerts.append((r['product_name'], r['batch'], alert_type))
    return new_alerts
```

```python
# process_qr_scan (dispense path)
def process_qr_scan(prescription_id, pharmacy_id=None):
    pres = get_prescription(prescription_id)
    meds = json.loads(pres.get('medications_json','[]'))
    for m in meds:
        ok,msg = decrement_stock(m['product_name'], m['batch'], int(m.get('qty',1)))
        if ok:
            record_sale(prescription_id, m['product_name'], m['batch'], int(m.get('qty',1)), pharmacy_id)
    # mark prescription dispensed
    # send patient expiry alerts
    return {'message': f'Prescription {prescription_id} dispensed successfully'}
```

```python
# app route - create_prescription (generates QR and writes CSV)
@app.route('/api/create_prescription', methods=['POST'])
def api_create_prescription():
    body = request.get_json(force=True)
    pid = body.get('prescription_id') or create_prescription(...)
    # generate QR pointing to /prescription/<pid>
    img = qrcode.make(f"{SITE_BASE.rstrip('/')}/prescription/{pid}")
    img.save(STATIC_QR_DIR / f"{pid}.png")
    run_alerts_and_send()
    return jsonify({'status':'ok','prescription_id':pid})
```

```python
# upload_bill handler (CSV import -> add_or_update_stock)
@app.route('/api/upload_bill', methods=['POST'])
def upload_bill():
    f = request.files['file']
    if f.filename.lower().endswith('.csv'):
        df = pd.read_csv(f, dtype=str, on_bad_lines='skip').fillna('')
        # iterate rows, map common header names to product_name,batch,exp,qty
        for _, r in df.iterrows():
            row = { 'product_name': r.get('product name') or r.get('name',''), 'batch': r.get('batch',''), 'exp': r.get('exp',''), 'qty': r.get('qty',0) }
            add_or_update_stock(row)
        run_alerts_and_send()
        return jsonify({'status':'ok'})
    else:
        # OCR path
        return jsonify({'status':'ok','note':'OCR path'})
```

```python
# check_dispensed_medicine_and_alert (send patient expiry emails after dispense)
def check_dispensed_medicine_and_alert(prescription_id):
    pres = get_prescription(prescription_id)
    patient = get_patient_by_id(pres['patient_id'])
    alerts_sent = []
    for m in json.loads(pres.get('medications_json','[]')):
        stock_df = read_csv_to_df(MED_STOCK)
        stock_row = stock_df[(stock_df['product_name'].str.lower()==m['product_name'].lower()) & (stock_df['batch']==m['batch'])]
        if stock_row.empty:
            continue
        days = (_try_parse_date(stock_row.iloc[0]['exp']) - datetime.utcnow().date()).days
        if days <= 15:
            create_alert_row(m['product_name'], m['batch'], stock_row.iloc[0]['exp'], days, 'expiring soon' if days>=0 else 'expired')
            send_email(patient.get('email') or patient.get('contact'), f"Alert: {m['product_name']}", "...", "<p>...</p>")
            alerts_sent.append(m)
    return alerts_sent
```

```javascript
// frontend: CreatePrescription -> payload example used by createPrescription API
const payload = {
  prescription_id: 'RX' + Date.now(),
  patient_id: selectedPatient,
  doctor_name: doctor,
  pharmacy_id: 'pharmacy_demo',
  medications: cart.map(c => ({product_name: c.product_name, batch: c.batch, qty: c.qty}))
}
await createPrescription(payload)
```

**Complete Code Implementations**

Full source code for the core functions referenced above:

```python
# backend/utils.py: Full add_or_update_stock function
def add_or_update_stock(row_dict):
    """
    Add or update medicine stock.
    - If ALL key fields match an existing entry -> increment its quantity.
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
```

```python
# backend/utils.py: Full check_expiry_and_create_alerts function
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
```

```python
# backend/utils.py: Full process_qr_scan function
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
```

```python
# backend/app.py: Full upload_bill endpoint
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

                qty = 0
                for c in ['qty', 'quantity', 'qnty', 'q', 'QTY']:
                    if c in df.columns and str(r.get(c, "")).strip():
                        try:
                            qty = int(float(r.get(c, 0) or 0))
                        except:
                            qty = 0
                        break

                if not prod and not batch:
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

            # after upload trigger alerts
            run_alerts_and_send(days_threshold=15, low_stock_threshold=5)
            return jsonify({"status": "ok", "imported": len(created)})

        else:
            # OCR path for images (best-effort)
            img = cv2.imread(str(dest))
            if img is None:
                return jsonify({"error": "image_read_failed"}), 400
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            text = pytesseract.image_to_string(gray)
            return jsonify({"status": "ok", "text": text, "note": "OCR best-effort"})
    except Exception as e:
        app.logger.exception("upload_bill handler failed")
        return jsonify({"error": "upload_failed", "detail": str(e)}), 500
```

```python
# backend/app.py: Full create_prescription endpoint
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
```

**How to use these snippets**
- Copy the Python snippets to inspect full implementations in `lifetag-prototype/backend/utils.py` and `app.py`.
- Use the frontend payload as-is when testing the `POST /api/create_prescription` endpoint.

If you'd like, I can:
- Add a minimal `backend/requirements.txt` entry with the exact packages.
- Generate a short PowerShell script to start backend and frontend.
- Create a focused `.github/copilot-instructions.md` for AI coding agents (20–40 lines).

---
Please review this summary. Tell me if you want it named `README.md` (replace) or kept as `PROJECT_README.md`, and whether to add exact `requirements.txt` contents and runnable start scripts.