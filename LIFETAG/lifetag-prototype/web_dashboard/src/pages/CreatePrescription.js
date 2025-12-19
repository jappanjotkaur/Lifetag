import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInventory, getPatients, createPrescription } from '../services/api';
import { ArrowLeft, Plus, Trash2, FileText, CheckCircle, AlertCircle, QrCode, Heart, Search } from 'lucide-react';

export default function CreatePrescription() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [doctor, setDoctor] = useState('Dr. Demo');
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [prescriptionId, setPrescriptionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getInventory().then(r => setInventory(r.data)).catch(() => setInventory([]));
    getPatients().then(r => setPatients(r.data)).catch(() => setPatients([]));
  }, []);

  const addToCart = (item) => {
    if (cart.some(c => c.product_name === item.product_name && c.batch === item.batch)) {
      setMessage({ type: 'error', text: 'Medicine already in cart' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    setCart([...cart, { ...item, qty: 1, dosage: 'As directed' }]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCart = (index, field, value) => {
    const newCart = [...cart];
    newCart[index][field] = value;
    setCart(newCart);
  };

  const handleCreate = async () => {
    if (!selectedPatient) {
      setMessage({ type: 'error', text: 'Please select a patient' });
      return;
    }
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Please add medicines to cart' });
      return;
    }

    const newId = 'RX' + Date.now();
    setPrescriptionId(newId);

    const payload = {
      prescription_id: newId,
      patient_id: selectedPatient,
      doctor_name: doctor,
      pharmacy_id: 'pharmacy_demo',
      medications: cart.map(c => ({
        product_name: c.product_name,
        batch: c.batch,
        qty: c.qty,
        dosage: c.dosage
      }))
    };

    setLoading(true);
    try {
      await createPrescription(payload);
      setMessage({ type: 'success', text: 'Prescription created successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create prescription' });
      setPrescriptionId('');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-lg shadow-md">
              <Heart className="w-7 h-7 text-white" fill="white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">LifeTag</h1>
              <p className="text-xs text-slate-500 font-medium">Medical Management System</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/doctor')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Doctor Dashboard</span>
        </button>

        {/* Page Title */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl">
            <FileText className="w-8 h-8 text-indigo-600" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Create Prescription</h2>
            <p className="text-slate-600 mt-1">Generate digital prescription with QR code</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Patient & Doctor Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Patient Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">Select Patient</label>
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.name} ({p.contact})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">Doctor Name</label>
                  <input
                    type="text"
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Cart Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">Total Items:</span>
                  <span className="text-slate-800 font-bold text-lg">{cart.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">Total Quantity:</span>
                  <span className="text-slate-800 font-bold text-lg">{cart.reduce((sum, item) => sum + parseInt(item.qty), 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Inventory */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md h-full">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Available Medicines</h3>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredInventory
                  .filter(item => item.product_name && item.product_name.trim() !== '')
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg p-4 cursor-pointer transition-all"
                      onClick={() => addToCart(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">{item.product_name}</p>
                          <p className="text-sm text-slate-600">Batch: {item.batch}</p>
                          <p className="text-sm text-slate-600">Stock: {item.qty}</p>
                        </div>
                        <div className="bg-indigo-100 p-2 rounded-lg">
                          <Plus className="w-5 h-5 text-indigo-600" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right: Cart */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md h-full">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Prescription Cart</h3>
              
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-slate-50 border border-slate-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No medicines added</p>
                  <p className="text-slate-400 text-sm mt-1">Click on medicines to add</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                  {cart.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-slate-800">{item.product_name}</p>
                          <p className="text-sm text-slate-600">Batch: {item.batch}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-600 font-semibold mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateCart(idx, 'qty', parseInt(e.target.value) || 1)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 font-semibold mb-1">Dosage</label>
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={(e) => updateCart(idx, 'dosage', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Message */}
              {message.text && (
                <div className={`mb-4 flex items-center gap-3 p-4 rounded-lg border ${
                  message.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span className="font-medium text-sm">{message.text}</span>
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={loading || cart.length === 0 || !selectedPatient}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg mb-4"
              >
                {loading ? 'Creating...' : 'Create Prescription & Generate QR'}
              </button>

              {/* QR Code Display */}
              {prescriptionId && (
                <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <div className="bg-green-50 border border-green-200 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Prescription ID: <span className="font-mono font-bold text-slate-800">{prescriptionId}</span>
                  </p>
                  <img
                    src={`http://localhost:5000/qrcodes/${prescriptionId}.png`}
                    alt="Prescription QR"
                    className="mx-auto rounded-lg shadow-md border-2 border-slate-200"
                    width="180"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-3" style={{display: 'none'}}>
                    QR code will be available shortly
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}