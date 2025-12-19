import 'dart:convert'; // ✅ Added: Missing import for jsonDecode
import 'dart:developer' as developer; // ✅ Added: For logging
import 'medicine.dart';

class Prescription {
  final String prescriptionId;
  final String patientId;
  final String doctorName;
  final String pharmacyId;
  final List<Medicine> medications;
  final DateTime createdAt;
  final String? qrPath;
  final String status; // created, dispensed
  final DateTime? dispensedAt;

  Prescription({
    required this.prescriptionId,
    required this.patientId,
    required this.doctorName,
    required this.pharmacyId,
    required this.medications,
    required this.createdAt,
    this.qrPath,
    this.status = 'created',
    this.dispensedAt,
  });

  factory Prescription.fromJson(Map<String, dynamic> json) {
    List<Medicine> meds = [];
    
    // Handle medications_json or medications field
    if (json['medications'] != null) {
      if (json['medications'] is List) {
        meds = (json['medications'] as List)
            .map((m) => Medicine.fromJson(m))
            .toList();
      }
    } else if (json['medications_json'] != null) {
      // Backend returns medications_json as string, need to parse
      var medsData = json['medications_json'];
      if (medsData is String) {
        try {
          var decoded = jsonDecode(medsData); // ✅ Now properly imported
          if (decoded is List) {
            meds = decoded.map((m) => Medicine.fromJson(m)).toList();
          }
        } catch (e) {
          // ✅ Fixed: Using developer.log instead of print
          developer.log('Error parsing medications_json: $e');
        }
      } else if (medsData is List) {
        meds = medsData.map((m) => Medicine.fromJson(m)).toList();
      }
    }

    return Prescription(
      prescriptionId: json['prescription_id'] ?? '',
      patientId: json['patient_id'] ?? '',
      doctorName: json['doctor_name'] ?? '',
      pharmacyId: json['pharmacy_id'] ?? '',
      medications: meds,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      qrPath: json['qr_path'],
      status: json['status'] ?? 'created',
      dispensedAt: json['dispensed_at'] != null
          ? DateTime.parse(json['dispensed_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'prescription_id': prescriptionId,
      'patient_id': patientId,
      'doctor_name': doctorName,
      'pharmacy_id': pharmacyId,
      'medications': medications.map((m) => m.toJson()).toList(),
      'created_at': createdAt.toIso8601String(),
      'qr_path': qrPath,
      'status': status,
      'dispensed_at': dispensedAt?.toIso8601String(),
    };
  }

  bool get isDispensed => status.toLowerCase() == 'dispensed';
  
  int get totalMedicines => medications.length;

  Prescription copyWith({
    String? prescriptionId,
    String? patientId,
    String? doctorName,
    String? pharmacyId,
    List<Medicine>? medications,
    DateTime? createdAt,
    String? qrPath,
    String? status,
    DateTime? dispensedAt,
  }) {
    return Prescription(
      prescriptionId: prescriptionId ?? this.prescriptionId,
      patientId: patientId ?? this.patientId,
      doctorName: doctorName ?? this.doctorName,
      pharmacyId: pharmacyId ?? this.pharmacyId,
      medications: medications ?? this.medications,
      createdAt: createdAt ?? this.createdAt,
      qrPath: qrPath ?? this.qrPath,
      status: status ?? this.status,
      dispensedAt: dispensedAt ?? this.dispensedAt,
    );
  }
}