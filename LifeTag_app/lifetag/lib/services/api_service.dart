import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/patient.dart';
import '../models/prescription.dart';
import '../models/medicine.dart';
import 'dart:developer' as developer;

class ApiService {
  // ⚠️ CHANGE THIS TO YOUR BACKEND URL
  static const String baseUrl = 'http://10.125.180.93:5000/api'; // Android Emulator
  // For iOS Simulator: 'http://localhost:5000/api'
  // For Real Device: 'http://YOUR_IP:5000/api' (e.g., http://192.168.1.100:5000/api)

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final Map<String, String> _headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // ============ PATIENT APIs ============

  /// Register a new patient
  Future<Patient> registerPatient({
    required String name,
    required int age,
    required String gender,
    required String contact,
    required String email,
    String? notes,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/register_patient'),
        headers: _headers,
        body: jsonEncode({
          'name': name,
          'age': age,
          'gender': gender,
          'contact': contact,
          'email': email,
          'notes': notes,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Patient(
          patientId: data['patient_id'],
          name: name,
          age: age,
          gender: gender,
          contact: contact,
          email: email,
          notes: notes,
          registeredAt: DateTime.now(),
        );
      } else {
        throw Exception('Failed to register patient: ${response.body}');
      }
    } catch (e) {
      throw Exception('Registration error: $e');
    }
  }

  /// Get all patients (for testing/admin)
  Future<List<Patient>> getPatients() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/patients'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Patient.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load patients');
      }
    } catch (e) {
      throw Exception('Error fetching patients: $e');
    }
  }

  /// Get patient by ID
  Future<Patient?> getPatientById(String patientId) async {
    try {
      final patients = await getPatients();
      return patients.firstWhere(
        (p) => p.patientId == patientId,
        orElse: () => throw Exception('Patient not found'),
      );
    } catch (e) {
      developer.log('Error getting patient: $e');
      return null;
    }
  }

  // ============ PRESCRIPTION APIs ============

  /// Get prescription by ID
  Future<Prescription> getPrescription(String prescriptionId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/prescription/$prescriptionId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Prescription.fromJson(data);
      } else {
        throw Exception('Prescription not found');
      }
    } catch (e) {
      throw Exception('Error fetching prescription: $e');
    }
  }

  /// Get all prescriptions for a patient
  Future<List<Prescription>> getPrescriptionsForPatient(String patientId) async {
    try {
      // Since backend doesn't have a direct endpoint, we fetch all and filter
      final response = await http.get(
        Uri.parse('$baseUrl/prescriptions'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data
            .map((json) => Prescription.fromJson(json))
            .where((p) => p.patientId == patientId)
            .toList();
      } else {
        return [];
      }
    } catch (e) {
      developer.log('Error fetching prescriptions: $e');
      return [];
    }
  }

  // ============ MEDICINE/INVENTORY APIs ============

  /// Get inventory (all medicines)
  Future<List<Medicine>> getInventory() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/inventory'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Medicine.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load inventory');
      }
    } catch (e) {
      throw Exception('Error fetching inventory: $e');
    }
  }

  /// Search medicine by name
  Future<List<Medicine>> searchMedicine(String query) async {
    try {
      final inventory = await getInventory();
      return inventory
          .where((med) =>
              med.productName.toLowerCase().contains(query.toLowerCase()))
          .toList();
    } catch (e) {
      throw Exception('Search error: $e');
    }
  }

  // ============ ALERTS APIs ============

  /// Get active alerts
  Future<List<Map<String, dynamic>>> getAlerts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/alerts'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.cast<Map<String, dynamic>>();
      } else {
        return [];
      }
    } catch (e) {
      developer.log('Error fetching alerts: $e');
      return [];
    }
  }

  /// Resolve an alert
  Future<bool> resolveAlert(String alertId, String userType) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/resolve_alert?alert_id=$alertId&user=$userType'),
        headers: _headers,
      );
      return response.statusCode == 200;
    } catch (e) {
      developer.log('Error resolving alert: $e');
      return false;
    }
  }

  // ============ QR SCAN / DISPENSE ============

  /// Scan QR and dispense prescription
  Future<Map<String, dynamic>> scanQrAndDispense({
    required String prescriptionId,
    String pharmacyId = 'pharmacy_demo',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/scan_qr'),
        headers: _headers,
        body: jsonEncode({
          'prescription_id': prescriptionId,
          'pharmacy_id': pharmacyId,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Dispense failed: ${response.body}');
      }
    } catch (e) {
      throw Exception('QR scan error: $e');
    }
  }

  // ============ UTILITY ============

  /// Get QR code image URL
  String getQrCodeUrl(String qrPath) {
    if (qrPath.isEmpty) return '';
    // Remove /static/qr/ prefix if present
    final filename = qrPath.replaceAll('/static/qr/', '');
    return '${baseUrl.replaceAll('/api', '')}/static/qr/$filename';
  }

  /// Test backend connection
  Future<bool> testConnection() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/alerts'),
        headers: _headers,
      ).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      developer.log('Connection test failed: $e');
      return false;
    }
  }
}