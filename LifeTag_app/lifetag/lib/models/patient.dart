class Patient {
  final String patientId;
  final String name;
  final int age;
  final String gender;
  final String contact;
  final String email;
  final String? notes;
  final DateTime registeredAt;

  Patient({
    required this.patientId,
    required this.name,
    required this.age,
    required this.gender,
    required this.contact,
    required this.email,
    this.notes,
    required this.registeredAt,
  });

  factory Patient.fromJson(Map<String, dynamic> json) {
    return Patient(
      patientId: json['patient_id'] ?? '',
      name: json['name'] ?? '',
      age: int.tryParse(json['age'].toString()) ?? 0,
      gender: json['gender'] ?? '',
      contact: json['contact'] ?? '',
      email: json['email'] ?? '',
      notes: json['notes'],
      registeredAt: json['registered_at'] != null
          ? DateTime.parse(json['registered_at'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'patient_id': patientId,
      'name': name,
      'age': age,
      'gender': gender,
      'contact': contact,
      'email': email,
      'notes': notes,
      'registered_at': registeredAt.toIso8601String(),
    };
  }

  Patient copyWith({
    String? patientId,
    String? name,
    int? age,
    String? gender,
    String? contact,
    String? email,
    String? notes,
    DateTime? registeredAt,
  }) {
    return Patient(
      patientId: patientId ?? this.patientId,
      name: name ?? this.name,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      contact: contact ?? this.contact,
      email: email ?? this.email,
      notes: notes ?? this.notes,
      registeredAt: registeredAt ?? this.registeredAt,
    );
  }
}