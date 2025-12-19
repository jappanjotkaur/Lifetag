import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient } from '../services/api';
import { User, Mail, Phone, Calendar, ArrowLeft, CheckCircle, AlertCircle, ClipboardList, FileText } from 'lucide-react';

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    contact: '',
    email: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.age || !form.gender || !form.contact) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await registerPatient(form);
      setMessage({ type: 'success', text: `Patient registered successfully! ID: ${res.data.patient_id}` });
      setTimeout(() => {
        setForm({ name: '', age: '', gender: '', contact: '', email: '', notes: '' });
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to register patient. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-teal-50">
      {/* Professional Medical Header */}
      <header className="bg-white shadow-sm border-b-2 border-emerald-500 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Medical Logo */}
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">LifeTag</h1>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Hospital Management System</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors mb-8 group bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 hover:border-emerald-300"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
          <span className="font-medium">Back to Home</span>
        </button>

        {/* Page Header */}
        <div className="bg-white rounded-2xl shadow-lg border-l-4 border-emerald-500 p-8 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <ClipboardList className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Patient Registration</h2>
              <p className="text-gray-600 mt-1 font-medium">Register new patients to the hospital system</p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
              <FileText className="w-6 h-6 text-emerald-600" strokeWidth={2} />
              <h3 className="text-xl font-bold text-gray-800">Patient Information Form</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  <User className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter patient's full name"
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium"
                  required
                />
              </div>

              {/* Age & Gender */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    <Calendar className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    placeholder="Age"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium"
                    required
                    min="0"
                    max="150"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    <User className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Contact & Email */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    <Phone className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contact"
                    value={form.contact}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    <Mail className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  <FileText className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                  Medical Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Any additional medical information, allergies, or special instructions..."
                  rows="4"
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none font-medium"
                />
              </div>

              {/* Message */}
              {message.text && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
                  message.type === 'success' 
                    ? 'bg-green-50 border-green-500 text-green-700' 
                    : 'bg-red-50 border-red-500 text-red-700'
                }`}>
                  {message.type === 'success' ? 
                    <CheckCircle className="w-6 h-6 flex-shrink-0" strokeWidth={2.5} /> : 
                    <AlertCircle className="w-6 h-6 flex-shrink-0" strokeWidth={2.5} />
                  }
                  <span className="font-semibold">{message.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl uppercase tracking-wide"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      Registering Patient...
                    </span>
                  ) : (
                    'Register Patient'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-emerald-700" strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 mb-1">Important Information</h4>
                <p className="text-sm text-emerald-800">
                  All patient information is encrypted and stored securely in compliance with HIPAA regulations. 
                  Fields marked with <span className="text-red-500 font-bold">*</span> are mandatory.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}