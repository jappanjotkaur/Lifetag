import 'package:flutter/material.dart';
import 'dart:developer' as developer;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  // Store notifications in memory
  final List<NotificationModel> _notifications = [];
  
  // Callback for when new notification arrives
  Function(NotificationModel)? onNotificationReceived;

  Future<void> init() async {
    developer.log('✅ Notification Service Initialized (In-App Mode)');
  }

  // ============ SHOW IN-APP NOTIFICATIONS ============

  Future<void> showInstantNotification({
    required String title,
    required String body,
    String? payload,
    NotificationType type = NotificationType.info,
  }) async {
    final notification = NotificationModel(
      id: DateTime.now().millisecondsSinceEpoch,
      title: title,
      body: body,
      payload: payload,
      type: type,
      timestamp: DateTime.now(),
      isRead: false,
    );

    _notifications.insert(0, notification);
    
    // Trigger callback
    onNotificationReceived?.call(notification);
    
    developer.log('📢 Notification: $title - $body');
  }

  // ============ MEDICINE REMINDERS ============

  Future<void> scheduleMedicineReminder({
    required int id,
    required String medicineName,
    required DateTime scheduledTime,
    String? dosage,
  }) async {
    developer.log('⏰ Medicine reminder scheduled: $medicineName at $scheduledTime');
    
    // In real app, you would use WorkManager or background tasks
    // For now, just log it
    await showInstantNotification(
      title: '💊 Medicine Reminder Set',
      body: 'Reminder for $medicineName at ${scheduledTime.hour}:${scheduledTime.minute}',
      type: NotificationType.medicine,
    );
  }

  Future<void> scheduleRecurringMedicineReminder({
    required int id,
    required String medicineName,
    required TimeOfDay time,
    String? dosage,
  }) async {
    developer.log('⏰ Recurring reminder for $medicineName at ${time.hour}:${time.minute}');
  }

  // ============ EXPIRY ALERTS ============

  Future<void> showExpiryAlert({
    required String medicineName,
    required String batch,
    required int daysLeft,
  }) async {
    final isExpired = daysLeft <= 0;
    final title = isExpired ? '⚠️ Medicine Expired!' : '⚠️ Expiring Soon';
    final body = isExpired
        ? '$medicineName (Batch: $batch) has expired'
        : '$medicineName expires in $daysLeft days';

    await showInstantNotification(
      title: title,
      body: body,
      payload: 'expiry_$batch',
      type: isExpired ? NotificationType.error : NotificationType.warning,
    );
  }

  // ============ LOW STOCK ALERTS ============

  Future<void> showLowStockAlert({
    required String medicineName,
    required int remainingQuantity,
  }) async {
    await showInstantNotification(
      title: '📦 Medicine Running Low',
      body: 'Only $remainingQuantity units of $medicineName remaining',
      type: NotificationType.warning,
    );
  }

  // ============ PRESCRIPTION READY ============

  Future<void> showPrescriptionReadyNotification({
    required String prescriptionId,
    required String pharmacyName,
  }) async {
    await showInstantNotification(
      title: '✅ Prescription Ready',
      body: 'Ready for pickup at $pharmacyName',
      payload: 'prescription_$prescriptionId',
      type: NotificationType.success,
    );
  }

  // ============ APPOINTMENT REMINDER ============

  Future<void> scheduleAppointmentReminder({
    required int id,
    required String doctorName,
    required DateTime appointmentTime,
    String? purpose,
  }) async {
    await showInstantNotification(
      title: '🏥 Appointment Reminder',
      body: 'Dr. $doctorName${purpose != null ? " - $purpose" : ""}',
      type: NotificationType.info,
    );
  }

  // ============ MANAGE NOTIFICATIONS ============

  List<NotificationModel> getNotifications() => List.from(_notifications);
  
  List<NotificationModel> getUnreadNotifications() =>
      _notifications.where((n) => !n.isRead).toList();

  int getUnreadCount() => getUnreadNotifications().length;

  void markAsRead(int id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
    }
  }

  void markAllAsRead() {
    for (int i = 0; i < _notifications.length; i++) {
      _notifications[i] = _notifications[i].copyWith(isRead: true);
    }
  }

  Future<void> cancelNotification(int id) async {
    _notifications.removeWhere((n) => n.id == id);
  }

  Future<void> cancelAllNotifications() async {
    _notifications.clear();
  }

  Future<bool> hasPermission() async => true;

  Future<void> showTestNotification() async {
    await showInstantNotification(
      title: '✅ Notifications Working!',
      body: 'LifeTag notifications are set up correctly',
      type: NotificationType.success,
    );
  }
}

// ============ NOTIFICATION MODEL ============

class NotificationModel {
  final int id;
  final String title;
  final String body;
  final String? payload;
  final NotificationType type;
  final DateTime timestamp;
  final bool isRead;

  NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    this.payload,
    required this.type,
    required this.timestamp,
    this.isRead = false,
  });

  NotificationModel copyWith({
    int? id,
    String? title,
    String? body,
    String? payload,
    NotificationType? type,
    DateTime? timestamp,
    bool? isRead,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      payload: payload ?? this.payload,
      type: type ?? this.type,
      timestamp: timestamp ?? this.timestamp,
      isRead: isRead ?? this.isRead,
    );
  }

  IconData get icon {
    switch (type) {
      case NotificationType.medicine:
        return Icons.medication_rounded;
      case NotificationType.warning:
        return Icons.warning_amber_rounded;
      case NotificationType.error:
        return Icons.error_rounded;
      case NotificationType.success:
        return Icons.check_circle_rounded;
      case NotificationType.info:
      default:
        return Icons.info_rounded;
    }
  }

  Color get color {
    switch (type) {
      case NotificationType.medicine:
        return const Color(0xFF14B8A6);
      case NotificationType.warning:
        return Colors.orange;
      case NotificationType.error:
        return Colors.red;
      case NotificationType.success:
        return Colors.green;
      case NotificationType.info:
      default:
        return Colors.blue;
    }
  }
}

enum NotificationType {
  info,
  success,
  warning,
  error,
  medicine,
}