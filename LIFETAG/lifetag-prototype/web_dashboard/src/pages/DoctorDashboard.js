import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, UserPlus, ArrowLeft, Stethoscope, ChevronRight } from 'lucide-react';

export default function DoctorDashboard() {
  const navigate = useNavigate();

  const options = [
    {
      title: "Register Patient",
      description: "Register a new patient to the hospital system with complete medical documentation",
      icon: UserPlus,
      path: "/patient-registration",
      gradient: "from-emerald-600 to-teal-600",
      iconBg: "from-emerald-500 to-teal-600"
    },
    {
      title: "Create Prescription",
      description: "Generate digital prescription with secure QR code for pharmacy dispensing",
      icon: FileText,
      path: "/create-prescription",
      gradient: "from-teal-600 to-cyan-600",
      iconBg: "from-teal-500 to-cyan-600"
    }
  ];

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
        <div className="bg-white rounded-2xl shadow-lg border-l-4 border-emerald-500 p-8 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Doctor Dashboard</h2>
              <p className="text-gray-600 mt-1 font-medium">Manage patients and create prescriptions</p>
            </div>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {options.map((option, idx) => {
            const Icon = option.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(option.path)}
                className="group cursor-pointer"
              >
                <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group-hover:-translate-y-2 border border-gray-100 h-full">
                  {/* Top Color Bar */}
                  <div className={`h-2 bg-gradient-to-r ${option.gradient}`}></div>
                  
                  <div className="p-8">
                    {/* Icon */}
                    <div className={`w-20 h-20 bg-gradient-to-br ${option.iconBg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" strokeWidth={2.5} />
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-4 text-gray-800">{option.title}</h3>
                    <p className="text-gray-600 leading-relaxed mb-6 font-medium min-h-[60px]">{option.description}</p>
                    
                    {/* Action Link */}
                    <div className="flex items-center text-emerald-600 group-hover:text-emerald-700 font-bold">
                      <span className="uppercase tracking-wide text-sm">Access Module</span>
                      <ChevronRight className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <UserPlus className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
              </div>
              <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Patient Registration</h4>
            </div>
            <p className="text-gray-600 text-sm font-medium">Quick access to register new patients with complete medical history</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-teal-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-teal-600" strokeWidth={2.5} />
              </div>
              <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Digital Prescriptions</h4>
            </div>
            <p className="text-gray-600 text-sm font-medium">Create secure prescriptions with QR codes for pharmacy verification</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-cyan-100 p-2 rounded-lg">
                <Stethoscope className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
              </div>
              <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Medical Records</h4>
            </div>
            <p className="text-gray-600 text-sm font-medium">Access and manage complete patient medical documentation</p>
          </div>
        </div>

        {/* Professional Notice */}
        <div className="max-w-5xl mx-auto mt-12">
          <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 mb-2 uppercase tracking-wide text-sm">Medical Professional Guidelines</h4>
                <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                  All medical records and prescriptions are HIPAA compliant and encrypted. Ensure accurate patient information and prescription details before submission. Digital signatures are legally binding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}