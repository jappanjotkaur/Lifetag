import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/patient.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // ============ PATIENT STORAGE ============

  Future<void> saveCurrentPatient(Patient patient) async {
    await _prefs?.setString('current_patient', jsonEncode(patient.toJson()));
  }

  Patient? getCurrentPatient() {
    final data = _prefs?.getString('current_patient');
    if (data != null) {
      return Patient.fromJson(jsonDecode(data));
    }
    return null;
  }

  Future<void> clearCurrentPatient() async {
    await _prefs?.remove('current_patient');
  }

  // ============ ONBOARDING ============

  Future<void> setOnboardingComplete(bool value) async {
    await _prefs?.setBool('onboarding_complete', value);
  }

  bool isOnboardingComplete() {
    return _prefs?.getBool('onboarding_complete') ?? false;
  }

  // ============ NOTIFICATION SETTINGS ============

  Future<void> setNotificationsEnabled(bool value) async {
    await _prefs?.setBool('notifications_enabled', value);
  }

  bool areNotificationsEnabled() {
    return _prefs?.getBool('notifications_enabled') ?? true;
  }

  // ============ MEDICINE REMINDERS ============

  Future<void> saveMedicineReminders(List<Map<String, dynamic>> reminders) async {
    await _prefs?.setString('medicine_reminders', jsonEncode(reminders));
  }

  List<Map<String, dynamic>> getMedicineReminders() {
    final data = _prefs?.getString('medicine_reminders');
    if (data != null) {
      return List<Map<String, dynamic>>.from(jsonDecode(data));
    }
    return [];
  }

  // ============ LAST SYNC ============

  Future<void> setLastSyncTime(DateTime time) async {
    await _prefs?.setString('last_sync', time.toIso8601String());
  }

  DateTime? getLastSyncTime() {
    final data = _prefs?.getString('last_sync');
    if (data != null) {
      return DateTime.parse(data);
    }
    return null;
  }

  // ============ CLEAR ALL ============

  Future<void> clearAll() async {
    await _prefs?.clear();
  }
}