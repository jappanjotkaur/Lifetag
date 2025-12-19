import React, { useState, useEffect } from "react";
import {
  uploadBill,
  getInventory,
  getAlerts,
  deleteStock,
} from "../services/api";

export default function ChemistUpload() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // ------------------ LOAD INVENTORY + ALERTS ------------------
  const load = () => {
    getInventory()
      .then((r) => setInventory(r.data))
      .catch(() => setInventory([]));
    getAlerts()
      .then((r) => setAlerts(r.data))
      .catch(() => setAlerts([]));
  };

  useEffect(() => {
    load();
  }, []);

  // ------------------ UPLOAD BILL ------------------
  const onUpload = async () => {
    if (!file) return setMsg("⚠️ Please choose a file first!");
    try {
      const res = await uploadBill(file);
      setMsg("✅ Upload successful: " + JSON.stringify(res.data));
      load();
    } catch (e) {
      setMsg("❌ Upload error: " + (e?.response?.data?.error || e.message));
    }
  };

  // ------------------ DELETE STOCK ------------------
  const onDelete = async (product_name, batch) => {
    try {
      // Validate fields
      if (!product_name || product_name.trim() === "") {
        alert("⚠️ Cannot delete — Product name is missing!");
        return;
      }
      if (!batch || batch.trim() === "") {
        alert("⚠️ Cannot delete — Batch number is missing!");
        return;
      }

      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${product_name} (Batch: ${batch})?`
      );
      if (!confirmDelete) return;

      await deleteStock(product_name, batch);
      alert("✅ Deleted successfully!");
      load();
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Failed to delete item. " + (err.message || ""));
    }
  };

  return (
    <div className="card">
      <h2>Upload Bill (CSV or Image)</h2>
      <div style={{ marginBottom: 12 }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button style={{ marginLeft: 8 }} onClick={onUpload}>
          Upload
        </button>
      </div>
      <div style={{ color: "#0b6efd" }}>{msg}</div>

      {/* ------------------ ALERTS ------------------ */}
      <h3 style={{ marginTop: 20 }}>Expiry Alerts</h3>
      <div className="grid">
        {alerts.length === 0 ? (
          <div className="card">No alerts</div>
        ) : (
          alerts.map((a) => (
            <div key={a.alert_id} className="card">
              <div>
                <strong>{a.product_name}</strong>
              </div>
              <div>Batch: {a.batch}</div>
              <div>
                Exp: {a.exp} ({a.days_to_expiry} days)
              </div>
            </div>
          ))
        )}
      </div>

      {/* ------------------ INVENTORY ------------------ */}
      <h3 style={{ marginTop: 20 }}>Inventory</h3>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Batch</th>
              <th>Exp</th>
              <th>Qty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {/* Hide entries missing product_name */}
            {inventory
              .filter(
                (r) => r.product_name && r.product_name.trim() !== ""
              )
              .map((r, idx) => (
                <tr key={idx}>
                  <td>{r.product_name}</td>
                  <td>{r.batch}</td>
                  <td>{r.exp}</td>
                  <td>{r.qty}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={() => onDelete(r.product_name, r.batch)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
