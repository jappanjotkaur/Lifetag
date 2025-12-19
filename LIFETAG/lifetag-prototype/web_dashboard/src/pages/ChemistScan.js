import React, { useState } from "react";
import { scanQr, getPrescription } from "../services/api";

export default function ChemistScan(){
  const [pid, setPid] = useState("");
  const [result, setResult] = useState(null);

  const onScan = async () => {
    try{
      const r = await scanQr({prescription_id: pid, pharmacy_id: "pharmacy_demo"});
      setResult(r.data);
    }catch(e){
      setResult({error: e?.response?.data || e.message});
    }
  };

  const fetchDetails = async () => {
    try{
      const r = await getPrescription(pid);
      setResult(r.data);
    }catch(e){
      setResult({error: e?.response?.data || e.message});
    }
  };

  return (
    <div className="card">
      <h2>Chemist: Scan QR</h2>
      <div>
        <input placeholder="Paste scanned prescription_id" value={pid} onChange={e=>setPid(e.target.value)} />
        <button onClick={onScan} style={{marginLeft:8}}>Dispense</button>
        <button onClick={fetchDetails} style={{marginLeft:8}}>View Prescription</button>
      </div>
      <pre style={{marginTop:12, whiteSpace:"pre-wrap"}}>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
