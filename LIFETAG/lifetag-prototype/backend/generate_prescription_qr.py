import os
import csv
import json
import time
import uuid
import qrcode
from datetime import datetime

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
PRESCRIPTION_FILE = os.path.join(UPLOAD_FOLDER, 'prescriptions.csv')
QR_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'qr')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(QR_FOLDER, exist_ok=True)

def generate_prescription_qr(patient_id, doctor_name, pharmacy_name, medicines):
    """
    Generates a unique prescription ID (starting with RX), saves to CSV,
    and creates a QR code image for it.
    """
    # Generate unique prescription ID
    prescription_id = f"RX{int(time.time() * 1000)}"

    timestamp = datetime.now().isoformat()
    status = "created"

    # Convert medicines list to JSON string for CSV
    medicines_json = json.dumps(medicines, ensure_ascii=False)

    # Save prescription record
    file_exists = os.path.exists(PRESCRIPTION_FILE)
    with open(PRESCRIPTION_FILE, mode="a", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        if not file_exists:
            writer.writerow([
                "prescription_id",
                "patient_id",
                "doctor_name",
                "pharmacy_name",
                "medicines",
                "timestamp",
                "remarks",
                "status"
            ])
        writer.writerow([
            prescription_id,
            patient_id,
            doctor_name,
            pharmacy_name,
            medicines_json,
            timestamp,
            "",
            status
        ])

    # Generate QR code image
    qr_data = {"prescription_id": prescription_id}
    qr = qrcode.make(json.dumps(qr_data))
    qr_path = os.path.join(QR_FOLDER, f"{prescription_id}.png")
    qr.save(qr_path)

    print(f"[QR Generated] {prescription_id} → {qr_path}")
    return prescription_id, qr_path
