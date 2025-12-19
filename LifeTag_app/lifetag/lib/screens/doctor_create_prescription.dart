// lib/screens/doctor_create_prescription.dart
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../api_service.dart';

class DoctorCreatePrescription extends StatefulWidget {
  const DoctorCreatePrescription({super.key});

  @override
  State<DoctorCreatePrescription> createState() => _DoctorCreatePrescriptionState();
}

class _DoctorCreatePrescriptionState extends State<DoctorCreatePrescription> {
  String? selectedPatientId;
  List<Map<String, dynamic>> meds = [];
  final _patientIdCtrl = TextEditingController();
  final _medName = TextEditingController();
  final _dosage = TextEditingController();
  final _qty = TextEditingController();
  final _times = TextEditingController();
  String? presId;
  String? qrPayload;
  String? qrUrl;

  void addMed() {
    if (_medName.text.isEmpty) return;
    meds.add({
      "name": _medName.text,
      "dosage": _dosage.text,
      "quantity": int.tryParse(_qty.text) ?? 1,
      "times": _times.text
          .split(',')
          .map((s) => s.trim())
          .where((s) => s != '')
          .toList(),
    });
    _medName.clear();
    _dosage.clear();
    _qty.clear();
    _times.clear();
    setState(() {});
  }

  Future<void> createPrescription() async {
    if (_patientIdCtrl.text.isEmpty || meds.isEmpty) return;
    var res = await ApiService.createPrescription("D001", _patientIdCtrl.text, meds);
    setState(() {
      presId = res['prescription_id'];
      qrUrl = res['qr_url'];
      qrPayload = res['payload']; // "RX:..."
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Doctor: Create Prescription')),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            TextField(
              controller: _patientIdCtrl,
              decoration: const InputDecoration(labelText: 'Patient ID'),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _medName,
                    decoration: const InputDecoration(labelText: 'Medicine'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _qty,
                    decoration: const InputDecoration(labelText: 'Qty'),
                  ),
                ),
              ],
            ),
            TextField(
              controller: _dosage,
              decoration: const InputDecoration(labelText: 'Dosage (e.g. 1/day)'),
            ),
            TextField(
              controller: _times,
              decoration: const InputDecoration(
                  labelText: 'Times (comma separated, e.g. 08:00,20:00)'),
            ),
            const SizedBox(height: 8),
            ElevatedButton(onPressed: addMed, child: const Text('Add Medicine')),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: meds.length,
                itemBuilder: (_, i) => ListTile(
                  title: Text(meds[i]['name']),
                  subtitle: Text(
                      'Dose: ${meds[i]['dosage']} • Qty: ${meds[i]['quantity']} • Times: ${(meds[i]['times'] as List).join(", ")}'),
                ),
              ),
            ),
            ElevatedButton(
                onPressed: createPrescription,
                child: const Text('Create & Generate QR')),
            if (qrPayload != null) ...[
              const SizedBox(height: 12),
              Text('Prescription ID: $presId'),
              const SizedBox(height: 8),
              // ✅ Corrected: use QrImageView instead of QrImage
              QrImageView(
                data: qrPayload!,
                size: 180,
              ),
              const SizedBox(height: 8),
              if (qrUrl != null) Text('QR URL: $qrUrl'),
            ]
          ],
        ),
      ),
    );
  }
}
