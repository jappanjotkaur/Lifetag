import 'package:flutter/foundation.dart';
import '../models/patient.dart';
import '../models/prescription.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import 'dart:developer' as developer;

class PatientProvider with ChangeNotifier {
  Patient? _currentPatient;
  List<Prescription> _prescriptions = [];
  List<Map<String, dynamic>> _alerts = [];
  bool _isLoading = false;
  String? _error;
  bool _isInitialized = false; // ✅ ADD THIS

  // Getters
  Patient? get currentPatient => _currentPatient;
  List<Prescription> get prescriptions => _prescriptions;
  List<Map<String, dynamic>> get alerts => _alerts;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasPatient => _currentPatient != null;
  bool get isInitialized => _isInitialized; // ✅ ADD THIS

  final ApiService _api = ApiService();
  final StorageService _storage = StorageService();

  // Initialize - Load patient from storage
  Future<void> init() async {
    if (_isInitialized) return; // ✅ ADD THIS CHECK
    
    _currentPatient = _storage.getCurrentPatient();
    if (_currentPatient != null) {
      await loadPatientData();
    }
    _isInitialized = true; // ✅ ADD THIS
    notifyListeners();
  }

  // Set current patient
  Future<void> setCurrentPatient(Patient patient) async {
    _currentPatient = patient;
    await _storage.saveCurrentPatient(patient);
    await loadPatientData();
    notifyListeners();
  }

  // Register new patient
  Future<bool> registerPatient({
    required String name,
    required int age,
    required String gender,
    required String contact,
    required String email,
    String? notes,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final patient = await _api.registerPatient(
        name: name,
        age: age,
        gender: gender,
        contact: contact,
        email: email,
        notes: notes,
      );

      await setCurrentPatient(patient);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Load all patient data (prescriptions, alerts)
  Future<void> loadPatientData() async {
    if (_currentPatient == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      // Load prescriptions
      _prescriptions = await _api.getPrescriptionsForPatient(_currentPatient!.patientId);
      
      // Load alerts
      _alerts = await _api.getAlerts();
      
      // Filter alerts relevant to patient's medicines
      _alerts = _alerts.where((alert) {
        final batch = alert['batch']?.toString().toLowerCase() ?? '';
        return _prescriptions.any((prescription) =>
            prescription.medications.any((med) =>
                med.batch.toLowerCase() == batch));
      }).toList();

      _error = null;
    } catch (e) {
      _error = e.toString();
      developer.log('Error loading patient data: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Refresh data
  Future<void> refresh() async {
    await loadPatientData();
  }

  // Get specific prescription
  Future<Prescription?> getPrescription(String prescriptionId) async {
    try {
      return await _api.getPrescription(prescriptionId);
    } catch (e) {
      developer.log('Error getting prescription: $e');
      return null;
    }
  }

  // Resolve alert
  Future<bool> resolveAlert(String alertId) async {
    try {
      final success = await _api.resolveAlert(alertId, 'patient');
      if (success) {
        _alerts.removeWhere((alert) => alert['alert_id'] == alertId);
        notifyListeners();
      }
      return success;
    } catch (e) {
      developer.log('Error resolving alert: $e');
      return false;
    }
  }

  // Logout
  Future<void> logout() async {
    _currentPatient = null;
    _prescriptions = [];
    _alerts = [];
    _isInitialized = false; // ✅ ADD THIS
    await _storage.clearCurrentPatient();
    notifyListeners();
  }

  // Get dispensed prescriptions
  List<Prescription> get dispensedPrescriptions =>
      _prescriptions.where((p) => p.isDispensed).toList();

  // Get pending prescriptions
  List<Prescription> get pendingPrescriptions =>
      _prescriptions.where((p) => !p.isDispensed).toList();

  // Get active alerts count
  int get activeAlertsCount => _alerts.length;

  // Get expired medicines count
  int get expiredMedicinesCount {
    return _alerts.where((alert) => alert['alert_type'] == 'expired').length;
  }

  // Get expiring soon count
  int get expiringSoonCount {
    return _alerts.where((alert) => alert['alert_type'] == 'expiring soon').length;
  }
}