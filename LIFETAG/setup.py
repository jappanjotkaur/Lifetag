import os

structure = {
    "lifetag-prototype": {
        "backend": {
            "uploads": {
                "medicine_stock.csv": "",
                "prescriptions.csv": "",
                "sales.csv": "",
                "patients.csv": "",
                "alerts.csv": "",
            },
            "static": {"qr": {}},
            "app.py": "",
            "utils.py": "",
            "requirements.txt": "",
            "generate_prescription_qr.py": "",
        },
        "web_dashboard": {
            "package.json": "",
            "public": {"index.html": ""},
            "src": {
                "index.js": "",
                "App.js": "",
                "services": {"api.js": ""},
                "pages": {
                    "ChemistUpload.js": "",
                    "DoctorCreatePrescription.js": "",
                    "ChemistScan.js": "",
                },
            },
        },
    }
}

def create_structure(base, tree):
    for name, content in tree.items():
        path = os.path.join(base, name)
        if isinstance(content, dict):
            os.makedirs(path, exist_ok=True)
            create_structure(path, content)
        else:
            with open(path, "w") as f:
                f.write(content)

create_structure(".", structure)
print("✅ LifeTag project structure created successfully!")
