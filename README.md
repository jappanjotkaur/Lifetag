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

**Quick troubleshooting hints**
- If QR isn't visible: check `lifetag-prototype/backend/static/qr/<id>.png` exists; frontend uses `http://localhost:5000/qrcodes/<id>.png` or `/static/qr/<id>.png`.
- If emails don't send: confirm SMTP env vars and credentials. Otherwise check console logs for printed email bodies.
- If parsing fails for expiry dates: review `_try_parse_date` in `utils.py` and update supported formats.
