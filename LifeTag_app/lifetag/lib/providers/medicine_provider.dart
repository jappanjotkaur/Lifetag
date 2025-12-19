import 'package:flutter/foundation.dart';
import '../models/medicine.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import 'dart:developer' as developer;

class MedicineProvider with ChangeNotifier {
  List<Medicine> _inventory = [];
  List<Medicine> _searchResults = [];
  bool _isLoading = false;
  String? _error;

  // Getters
  List<Medicine> get inventory => _inventory;
  List<Medicine> get searchResults => _searchResults;
  bool get isLoading => _isLoading;
  String? get error => _error;

  final ApiService _api = ApiService();
  final NotificationService _notifications = NotificationService();

  // Load inventory
  Future<void> loadInventory() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _inventory = await _api.getInventory();
      _error = null;
    } catch (e) {
      _error = e.toString();
      developer.log('Error loading inventory: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Search medicine
  Future<void> searchMedicine(String query) async {
    if (query.isEmpty) {
      _searchResults = [];
      notifyListeners();
      return;
    }

    _isLoading = true;
    notifyListeners();

    try {
      _searchResults = await _api.searchMedicine(query);
    } catch (e) {
      _error = e.toString();
      developer.log('Error searching medicine: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Clear search
  void clearSearch() {
    _searchResults = [];
    notifyListeners();
  }

  // Get medicine by batch
  Medicine? getMedicineByBatch(String batch) {
    try {
      return _inventory.firstWhere(
        (med) => med.batch.toLowerCase() == batch.toLowerCase(),
      );
    } catch (e) {
      return null;
    }
  }

  // Get expired medicines
  List<Medicine> get expiredMedicines =>
      _inventory.where((med) => med.isExpired).toList();

  // Get expiring soon medicines
  List<Medicine> get expiringSoonMedicines =>
      _inventory.where((med) => med.isExpiringSoon && !med.isExpired).toList();

  // Check and send expiry notifications
  Future<void> checkExpiryNotifications() async {
    for (var medicine in expiredMedicines) {
      await _notifications.showExpiryAlert(
        medicineName: medicine.productName,
        batch: medicine.batch,
        daysLeft: medicine.daysToExpiry ?? -1,
      );
    }

    for (var medicine in expiringSoonMedicines) {
      await _notifications.showExpiryAlert(
        medicineName: medicine.productName,
        batch: medicine.batch,
        daysLeft: medicine.daysToExpiry ?? 0,
      );
    }
  }
}