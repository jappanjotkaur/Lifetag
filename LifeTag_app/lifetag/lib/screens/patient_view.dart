// lib/screens/patient_view.dart
import 'package:flutter/material.dart';
import '../api_service.dart';

class PatientViewScreen extends StatefulWidget {
  const PatientViewScreen({super.key});
  @override
  State<PatientViewScreen> createState() => _PatientViewScreenState();
}

class _PatientViewScreenState extends State<PatientViewScreen> {
  final _id = TextEditingController();
  List meds = [];

  fetch() async {
    var res = await ApiService.getPatientMeds(_id.text);
    setState((){ meds = res; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Patient: My Medicines')),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(children: [
          TextField(controller: _id, decoration: const InputDecoration(labelText:'Patient ID')),
          ElevatedButton(onPressed: fetch, child: const Text('Fetch Medicines')),
          const SizedBox(height:8),
          Expanded(child: ListView.builder(
            itemCount: meds.length,
            itemBuilder: (_,i) {
              final m = meds[i];
              return ListTile(
                title: Text(m['medicine_name'] ?? ''),
                subtitle: Text('Expiry: ${m['expiry_date'] ?? '-'}\nDispensed: ${m['sale_date'] ?? '-'}'),
              );
            },
          ))
        ]),
      ),
    );
  }
}
