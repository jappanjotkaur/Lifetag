import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Activity, Users, Package, FileText, ClipboardList, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const cards = [
    {
      title: "Patient Registration",
      icon: ClipboardList,
      description: "Register and manage patient medical records with secure digital documentation",
      path: "/patient-registration",
      gradient: "from-emerald-600 to-teal-600"
    },
    {
      title: "Pharmacy Management",
      icon: Package,
      description: "Comprehensive inventory management with automated expiry tracking system",
      path: "/pharmacy",
      gradient: "from-green-600 to-emerald-600"
    },
    {
      title: "Doctor Prescription",
      icon: FileText,
      description: "Digital prescription generation with secure QR code authentication",
      path: "/doctor",
      gradient: "from-teal-600 to-cyan-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-teal-50">
      {/* Professional Medical Header */}
      <header className="bg-white shadow-sm border-b-2 border-emerald-500 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
            
            {/* Status Indicator */}
            <div className="hidden md:flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-semibold text-emerald-700">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className={`text-center mb-16 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white px-5 py-2 rounded-full shadow-sm border border-emerald-200 mb-6">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-sm font-semibold text-emerald-700">Advanced Healthcare Technology</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
            Smart Medicine<br/>
            <span className="text-emerald-600">Management System</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Ensuring patient safety through intelligent tracking, automated alerts, and comprehensive digital healthcare management
          </p>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <Shield className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-gray-700">Expiry Monitoring</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <Activity className="w-5 h-5 text-teal-600" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-gray-700">Real-time Tracking</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <Users className="w-5 h-5 text-green-600" strokeWidth={2.5} />
              <span className="text-sm font-semibold text-gray-700">Patient Safety</span>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className={`group cursor-pointer transition-all duration-700 ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
                onClick={() => navigate(card.path)}
              >
                <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group-hover:-translate-y-2 border border-gray-100">
                  {/* Top Color Bar */}
                  <div className={`h-2 bg-gradient-to-r ${card.gradient}`}></div>
                  
                  <div className="p-8">
                    {/* Icon */}
                    <div className={`w-16 h-16 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                      <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-3 text-gray-800">{card.title}</h3>
                    <p className="text-gray-600 leading-relaxed mb-6 min-h-[60px]">{card.description}</p>
                    
                    {/* Action Button */}
                    <div className="flex items-center text-emerald-600 group-hover:text-emerald-700 font-semibold">
                      <span>Access Module</span>
                      <ChevronRight className="w-5 h-5 ml-1 transform group-hover:translate-x-2 transition-transform" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Stats/Info */}
        <div className={`mt-20 text-center transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <div className="inline-flex flex-col md:flex-row items-center gap-6 bg-white rounded-2xl shadow-lg px-8 py-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-semibold text-gray-700">All Systems Operational</span>
            </div>
            
            <div className="hidden md:block w-px h-8 bg-gray-300"></div>
            
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-gray-600 font-medium">
                Last Updated: {new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>

            <div className="hidden md:block w-px h-8 bg-gray-300"></div>

            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              <span className="text-sm text-gray-600 font-medium">ISO 27001 Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">
              © 2024 LifeTag Hospital Management System. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors">Terms of Service</a>
              <a href="#" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}