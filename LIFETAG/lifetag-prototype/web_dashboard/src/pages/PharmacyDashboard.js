import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadBill, getInventory, getAlerts, deleteStock, getPrescription, dispensePrescription } from '../services/api';
import { Upload, Package, AlertTriangle, Trash2, ArrowLeft, Search, QrCode, Eye, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    getInventory().then(r => setInventory(r.data)).catch(() => setInventory([]));
    getAlerts().then(r => setAlerts(r.data)).catch(() => setAlerts([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setMessage('⚠️ Please select a file first!');
      return;
    }

    setLoading(true);
    try {
      const res = await uploadBill(file);
      setMessage('✅ Upload successful! ' + (res.data.imported || '') + ' items added.');
      setFile(null);
      loadData();
    } catch (err) {
      setMessage('❌ Upload failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (product_name, batch) => {
    if (!window.confirm(`Delete ${product_name} (Batch: ${batch})?`)) return;

    try {
      await deleteStock(product_name, batch);
      setMessage('✅ Deleted successfully!');
      loadData();
    } catch (err) {
      setMessage('❌ Delete failed: ' + err.message);
    }
  };

  const handleViewPrescription = async () => {
    if (!prescriptionId.trim()) return;

    setLoading(true);
    try {
      const res = await getPrescription(prescriptionId);
      setPrescriptionData(res.data);
      setMessage('');
    } catch (err) {
      setMessage('❌ Prescription not found');
      setPrescriptionData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async () => {
    if (!prescriptionId.trim()) return;

    if (!window.confirm('Dispense this prescription?')) return;

    setLoading(true);
    try {
      await dispensePrescription({ prescription_id: prescriptionId, pharmacy_id: 'pharmacy_demo' });
      setMessage('✅ Prescription dispensed successfully!');
      setPrescriptionData(null);
      setPrescriptionId('');
      loadData();
    } catch (err) {
      setMessage('❌ Dispensing failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-teal-50">
      {/* Professional Medical Header */}
      <header className="bg-white shadow-sm border-b-2 border-teal-500 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Medical Logo */}
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">LifeTag</h1>
              <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Hospital Management System</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-8 group bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 hover:border-teal-300"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
          <span className="font-medium">Back to Home</span>
        </button>

        {/* Page Header */}
        <div className="bg-white rounded-2xl shadow-lg border-l-4 border-teal-500 p-8 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Pharmacy Dashboard</h2>
              <p className="text-gray-600 mt-1 font-medium">Manage inventory, alerts, and prescriptions</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'upload', label: 'Upload Bills', icon: Upload },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
            { id: 'scan', label: 'Scan & Dispense', icon: QrCode }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap uppercase tracking-wide ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-teal-400 hover:text-teal-600 shadow-sm'
              }`}
            >
              <tab.icon className="w-5 h-5" strokeWidth={2.5} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border-2 font-semibold flex items-center gap-3 ${
            message.includes('✅') 
              ? 'bg-green-50 border-green-500 text-green-700' 
              : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            {message.includes('✅') ? 
              <CheckCircle className="w-6 h-6" strokeWidth={2.5} /> : 
              <XCircle className="w-6 h-6" strokeWidth={2.5} />
            }
            {message}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              <div className="flex items-center gap-3 mb-6 pb-6 border-b-2 border-gray-200">
                <Upload className="w-6 h-6 text-teal-600" strokeWidth={2.5} />
                <h3 className="text-2xl font-bold text-gray-800">Upload Medicine Bill</h3>
              </div>
              <div className="space-y-6">
                <div className="border-2 border-dashed border-teal-300 rounded-xl p-12 text-center hover:border-teal-500 hover:bg-teal-50/30 transition-all bg-gray-50">
                  <div className="bg-teal-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-10 h-10 text-teal-600" strokeWidth={2.5} />
                  </div>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                    accept=".csv,.png,.jpg,.jpeg"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-block bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-md hover:shadow-lg uppercase tracking-wide"
                  >
                    Choose File
                  </label>
                  {file && (
                    <p className="mt-4 text-gray-700 font-semibold">Selected: <span className="text-teal-600">{file.name}</span></p>
                  )}
                  <p className="text-sm text-gray-500 mt-4">Supported formats: CSV, PNG, JPG, JPEG</p>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={loading || !file}
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl uppercase tracking-wide"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </span>
                  ) : (
                    'Upload Bill'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b-2 border-gray-200">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-teal-600" strokeWidth={2.5} />
                  <h3 className="text-2xl font-bold text-gray-800">Medicine Inventory</h3>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2.5} />
                  <input
                    type="text"
                    placeholder="Search medicines..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium w-full md:w-80"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 text-gray-700 font-bold uppercase tracking-wide text-sm">Product</th>
                      <th className="text-left py-4 px-4 text-gray-700 font-bold uppercase tracking-wide text-sm">Batch</th>
                      <th className="text-left py-4 px-4 text-gray-700 font-bold uppercase tracking-wide text-sm">Expiry</th>
                      <th className="text-left py-4 px-4 text-gray-700 font-bold uppercase tracking-wide text-sm">Qty</th>
                      <th className="text-left py-4 px-4 text-gray-700 font-bold uppercase tracking-wide text-sm">Status</th>
                      <th className="text-left py-4 px-4 text-gray-700 font-bold uppercase tracking-wide text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-16">
                          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-semibold">No inventory items found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredInventory
                        .filter(item => item.product_name && item.product_name.trim() !== '')
                        .map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-gray-800 font-bold">{item.product_name}</td>
                            <td className="py-4 px-4 text-gray-600 font-medium">{item.batch}</td>
                            <td className="py-4 px-4 text-gray-600 font-medium">{item.exp}</td>
                            <td className="py-4 px-4">
                              <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
                                parseInt(item.qty) < 10 
                                  ? 'bg-red-50 text-red-700 border-red-500' 
                                  : 'bg-green-50 text-green-700 border-green-500'
                              }`}>
                                {item.qty}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {item.expired ? (
                                <span className="px-4 py-2 rounded-full bg-red-50 text-red-700 border-2 border-red-500 text-sm font-bold">
                                  EXPIRED
                                </span>
                              ) : item.days_to_expiry !== null && item.days_to_expiry < 15 ? (
                                <span className="px-4 py-2 rounded-full bg-orange-50 text-orange-700 border-2 border-orange-500 text-sm font-bold">
                                  {item.days_to_expiry}d LEFT
                                </span>
                              ) : (
                                <span className="px-4 py-2 rounded-full bg-green-50 text-green-700 border-2 border-green-500 text-sm font-bold">
                                  GOOD
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => handleDelete(item.product_name, item.batch)}
                                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-500 px-4 py-2 rounded-lg transition-all font-bold uppercase text-sm"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div>
              <div className="flex items-center gap-3 mb-6 pb-6 border-b-2 border-gray-200">
                <AlertTriangle className="w-6 h-6 text-orange-600" strokeWidth={2.5} />
                <h3 className="text-2xl font-bold text-gray-800">Expiry Alerts</h3>
              </div>
              {alerts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" strokeWidth={2.5} />
                  </div>
                  <p className="text-gray-700 text-lg font-bold mb-2">No Active Alerts</p>
                  <p className="text-gray-500 font-medium">All medicines are within safe expiry dates</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {alerts.map(alert => (
                    <div
                      key={alert.alert_id}
                      className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-6 shadow-md hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-red-100 p-3 rounded-lg flex-shrink-0">
                          <AlertTriangle className="w-6 h-6 text-red-600" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-800 mb-3">{alert.product_name}</h4>
                          <div className="space-y-2 text-sm font-medium">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Batch:</span>
                              <span className="text-gray-800 font-bold">{alert.batch}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Expiry:</span>
                              <span className="text-gray-800 font-bold">{alert.exp}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Days Left:</span>
                              <span className="text-red-700 font-bold">{alert.days_to_expiry}</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-red-200">
                              <span className="text-red-700 font-bold uppercase text-xs tracking-wide">{alert.alert_type}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scan & Dispense Tab */}
          {activeTab === 'scan' && (
            <div>
              <div className="flex items-center gap-3 mb-6 pb-6 border-b-2 border-gray-200">
                <QrCode className="w-6 h-6 text-teal-600" strokeWidth={2.5} />
                <h3 className="text-2xl font-bold text-gray-800">Scan QR & Dispense</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-bold mb-3 uppercase tracking-wide text-sm">Prescription ID</label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={prescriptionId}
                      onChange={(e) => setPrescriptionId(e.target.value)}
                      placeholder="Enter or scan prescription ID"
                      className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium"
                    />
                    <button
                      onClick={handleViewPrescription}
                      disabled={loading || !prescriptionId.trim()}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-all disabled:opacity-50 shadow-md uppercase tracking-wide"
                    >
                      <Eye className="w-5 h-5" strokeWidth={2.5} />
                      View
                    </button>
                  </div>
                </div>

                {/* Prescription Details */}
                {prescriptionData && (
                  <div className="bg-gradient-to-br from-gray-50 to-teal-50 border-2 border-teal-300 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-teal-200">
                      <FileText className="w-6 h-6 text-teal-600" strokeWidth={2.5} />
                      <h4 className="text-xl font-bold text-gray-800">Prescription Details</h4>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Prescription ID</p>
                        <p className="text-gray-800 font-bold text-lg">{prescriptionData.prescription_id}</p>
                      </div>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Patient ID</p>
                        <p className="text-gray-800 font-bold text-lg">{prescriptionData.patient_id}</p>
                      </div>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Doctor</p>
                        <p className="text-gray-800 font-bold text-lg">{prescriptionData.doctor_name}</p>
                      </div>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Status</p>
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold border-2 ${
                          prescriptionData.status === 'dispensed' 
                            ? 'bg-green-50 text-green-700 border-green-500' 
                            : 'bg-blue-50 text-blue-700 border-blue-500'
                        }`}>
                          {prescriptionData.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h5 className="text-lg font-bold text-gray-800 mb-3 uppercase tracking-wide">Medications</h5>
                      <div className="space-y-3">
                        {prescriptionData.medications?.map((med, idx) => (
                          <div key={idx} className="bg-white border-2 border-gray-200 rounded-lg p-4 flex justify-between items-center">
                            <div>
                              <p className="text-gray-800 font-bold text-lg">{med.product_name}</p>
                              <p className="text-gray-600 text-sm font-medium">Batch: {med.batch} | Dosage: {med.dosage || 'As directed'}</p>
                            </div>
                            <span className="bg-teal-50 text-teal-700 border-2 border-teal-500 px-4 py-2 rounded-full text-sm font-bold">
                              QTY: {med.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {prescriptionData.status !== 'dispensed' && (
                      <button
                        onClick={handleDispense}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 shadow-lg hover:shadow-xl uppercase tracking-wide"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            Dispensing...
                          </span>
                        ) : (
                          'Dispense Prescription'
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}