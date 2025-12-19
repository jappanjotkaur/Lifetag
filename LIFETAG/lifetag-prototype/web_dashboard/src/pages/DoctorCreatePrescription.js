import React, { useState, useEffect } from "react";
import {
  getInventory,
  registerPatient,
  getPatients,
  createPrescription,
} from "../services/api";

export default function DoctorCreatePrescription() {
  const [inventory, setInventory] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    gender: "",
    contact: "",
    email: "",
    notes: "",
  });
  const [selectedPatient, setSelectedPatient] = useState("");
  const [doctor, setDoctor] = useState("Dr Demo");
  const [pharmacyId, setPharmacyId] = useState("pharmacy_demo");
  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");

  // Fetch inventory and patients on load
  useEffect(() => {
    getInventory()
      .then((r) => setInventory(r.data))
      .catch(() => setInventory([]));

    getPatients()
      .then((r) => setPatients(r.data))
      .catch(() => setPatients([]));
  }, []);

  // Register new patient
  const addPatient = async () => {
    if (!patientForm.name || !patientForm.contact) {
      setMsg("Please fill in name and contact before registering.");
      return;
    }

    try {
      const res = await registerPatient(patientForm);
      setMsg("Patient created: " + res.data.patient_id);
      setPatients((prev) => [
        ...prev,
        {
          ...patientForm,
          patient_id: res.data.patient_id,
          registered_at: new Date().toISOString(),
        },
      ]);
      setSelectedPatient(res.data.patient_id);
      setPatientForm({
        name: "",
        age: "",
        gender: "",
        contact: "",
        email: "",
        notes: "",
      });
    } catch (e) {
      setMsg("Error registering patient");
    }
  };

  // Add selected medicine to prescription cart
  const addToCart = (item) => {
    setCart((prev) => [...prev, { ...item, qty: 1, dosage: "" }]);
  };

  // Create prescription
  const create = async () => {
    if (!selectedPatient) return setMsg("Select a patient");
    if (cart.length === 0) return setMsg("Add medicines first");

    const meds = cart.map((c) => ({
      product_name: c.product_name,
      batch: c.batch,
      qty: c.qty,
      dosage: c.dosage,
    }));

    const newId = "RX" + Date.now();
    setPrescriptionId(newId);

    const payload = {
      prescription_id: newId,
      patient_id: selectedPatient,
      doctor_name: doctor,
      pharmacy_id: pharmacyId,
      medications: meds,
    };

    try {
      await createPrescription(payload);
      setMsg("Prescription created successfully. QR generated below.");
    } catch (err) {
      setMsg("Error creating prescription");
    }
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <h2>Create Prescription</h2>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Left: Register Patient */}
        <div style={{ flex: 1 }}>
          <h4>Register Patient</h4>
          <input
            placeholder="Name"
            value={patientForm.name}
            onChange={(e) =>
              setPatientForm({ ...patientForm, name: e.target.value })
            }
          />
          <input
            placeholder="Age"
            value={patientForm.age}
            onChange={(e) =>
              setPatientForm({ ...patientForm, age: e.target.value })
            }
          />
          <input
            placeholder="Gender"
            value={patientForm.gender}
            onChange={(e) =>
              setPatientForm({ ...patientForm, gender: e.target.value })
            }
          />
          <input
            placeholder="Contact"
            value={patientForm.contact}
            onChange={(e) =>
              setPatientForm({ ...patientForm, contact: e.target.value })
            }
          />
          <input
            placeholder="Email"
            value={patientForm.email}
            onChange={(e) =>
              setPatientForm({ ...patientForm, email: e.target.value })
            }
          />
          <textarea
            placeholder="Notes"
            value={patientForm.notes}
            onChange={(e) =>
              setPatientForm({ ...patientForm, notes: e.target.value })
            }
          />
          <button onClick={addPatient}>Register</button>
        </div>

        {/* Right: Select Patient & Inventory */}
        <div style={{ flex: 1 }}>
          <h4>Select Patient</h4>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          >
            <option value="">-- choose --</option>
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name} ({p.contact})
              </option>
            ))}
          </select>

          <h4>Inventory</h4>
          <div style={{ maxHeight: 220, overflow: "auto" }}>
            <table border="1" cellPadding="5">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.product_name}</td>
                    <td>{r.batch}</td>
                    <td>{r.qty}</td>
                    <td>
                      <button onClick={() => addToCart(r)}>Add</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cart */}
      <h4 style={{ marginTop: 16 }}>Cart</h4>
      <div className="card">
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>Product</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Dosage</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((c, idx) => (
              <tr key={idx}>
                <td>{c.product_name}</td>
                <td>{c.batch}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={c.qty}
                    onChange={(e) => {
                      const q = parseInt(e.target.value || 1);
                      setCart((prev) => {
                        const clone = [...prev];
                        clone[idx].qty = q;
                        return clone;
                      });
                    }}
                  />
                </td>
                <td>
                  <input
                    value={c.dosage}
                    onChange={(e) => {
                      setCart((prev) => {
                        const clone = [...prev];
                        clone[idx].dosage = e.target.value;
                        return clone;
                      });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={create} style={{ marginTop: 10 }}>
          Create Prescription & Generate QR
        </button>
      </div>

      {/* Message and QR */}
      <div style={{ color: "#0b6efd", marginTop: 10 }}>{msg}</div>

      {prescriptionId && (
        <div style={{ marginTop: 20 }}>
          <h4>Prescription ID: {prescriptionId}</h4>
          <img
            src={`http://127.0.0.1:5000/qrcodes/${prescriptionId}.png`}
            alt="Prescription QR"
            width="200"
          />
        </div>
      )}
    </div>
  );
}
