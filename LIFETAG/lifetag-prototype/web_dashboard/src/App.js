import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PatientRegistration from "./pages/PatientRegistration";
import PharmacyDashboard from "./pages/PharmacyDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import CreatePrescription from "./pages/CreatePrescription";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/patient-registration" element={<PatientRegistration />} />
      <Route path="/pharmacy" element={<PharmacyDashboard />} />
      <Route path="/doctor" element={<DoctorDashboard />} />
      <Route path="/create-prescription" element={<CreatePrescription />} />
    </Routes>
  );
}

export default App;
