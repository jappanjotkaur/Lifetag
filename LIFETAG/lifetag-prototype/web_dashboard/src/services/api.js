import axios from "axios";
const BASE = "http://localhost:5000/api";

// ---------- FILE UPLOAD ----------
export const uploadBill = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return axios.post(`${BASE}/upload_bill`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ---------- FETCH DATA ----------
export const getInventory = () => axios.get(`${BASE}/inventory`);
export const getAlerts = () => axios.get(`${BASE}/alerts`);
export const getPatients = () => axios.get(`${BASE}/patients`);
export const getPrescription = (pid) => axios.get(`${BASE}/prescription/${pid}`);

// ---------- PATIENT & PRESCRIPTION ----------
export const registerPatient = (data) =>
  axios.post(`${BASE}/register_patient`, data);

export const createPrescription = (data) =>
  axios.post(`${BASE}/create_prescription`, data);

// ---------- QR SCAN / Dispense ----------
export const scanQr = (payload) => axios.post(`${BASE}/scan_qr`, payload);
export const dispensePrescription = (payload) => axios.post(`${BASE}/scan_qr`, payload);

// ---------- DELETE STOCK ----------
export const deleteStock = async (product_name, batch) => {
  if (!product_name || product_name.trim() === "") {
    throw new Error("Product name missing – cannot delete entry.");
  }
  if (!batch || batch.trim() === "") {
    throw new Error("Batch number missing – cannot delete entry.");
  }
  return axios.post(`${BASE}/delete_stock`, { product_name, batch });
};