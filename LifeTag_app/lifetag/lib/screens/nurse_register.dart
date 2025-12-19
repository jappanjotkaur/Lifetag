// lib/screens/nurse_register.dart
import 'package:flutter/material.dart';
import '../api_service.dart';

class NurseRegisterScreen extends StatefulWidget {
  const NurseRegisterScreen({super.key});
  @override
  State<NurseRegisterScreen> createState() => _NurseRegisterScreenState();
}

class _NurseRegisterScreenState extends State<NurseRegisterScreen> {
  final _name = TextEditingController();
  final _age = TextEditingController();
  final _gender = TextEditingController();
  final _contact = TextEditingController();
  String? _result;

  register() async {
    var res = await ApiService.registerPatient(_name.text, _age.text, _gender.text, _contact.text);
    setState(() { _result = res.toString(); });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nurse: Register Patient')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          TextField(controller: _name, decoration: const InputDecoration(labelText:'Name')),
          TextField(controller: _age, decoration: const InputDecoration(labelText:'Age')),
          TextField(controller: _gender, decoration: const InputDecoration(labelText:'Gender')),
          TextField(controller: _contact, decoration: const InputDecoration(labelText:'Contact')),
          const SizedBox(height:12),
          ElevatedButton(onPressed: register, child: const Text('Register')),
          if (_result != null) ...[const SizedBox(height:12), Text(_result!)]
        ]),
      ),
    );
  }
}
