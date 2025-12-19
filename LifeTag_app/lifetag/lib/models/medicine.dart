class Medicine {
  final String productName;
  final String batch;
  final String expiry;
  final int quantity;
  final String? dosage;
  final int? daysToExpiry;
  final bool isExpired;
  final String? manufacturer;
  final String? hsn;
  final String? mrp;

  Medicine({
    required this.productName,
    required this.batch,
    required this.expiry,
    required this.quantity,
    this.dosage,
    this.daysToExpiry,
    this.isExpired = false,
    this.manufacturer,
    this.hsn,
    this.mrp,
  });

  factory Medicine.fromJson(Map<String, dynamic> json) {
    return Medicine(
      productName: json['product_name'] ?? '',
      batch: json['batch'] ?? '',
      expiry: json['exp'] ?? json['expiry'] ?? '',
      quantity: int.tryParse(json['qty'].toString()) ?? 0,
      dosage: json['dosage'],
      daysToExpiry: json['days_to_expiry'] != null
          ? int.tryParse(json['days_to_expiry'].toString())
          : null,
      isExpired: json['expired'] == true || json['expired'] == 'true',
      manufacturer: json['manufacturer'],
      hsn: json['hsn'],
      mrp: json['mrp'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'product_name': productName,
      'batch': batch,
      'exp': expiry,
      'qty': quantity,
      'dosage': dosage,
      'days_to_expiry': daysToExpiry,
      'expired': isExpired,
      'manufacturer': manufacturer,
      'hsn': hsn,
      'mrp': mrp,
    };
  }

  bool get isExpiringSoon => daysToExpiry != null && daysToExpiry! <= 15;
  
  String get statusText {
    if (isExpired) return 'EXPIRED';
    if (isExpiringSoon) return 'EXPIRING SOON';
    return 'GOOD';
  }

  Medicine copyWith({
    String? productName,
    String? batch,
    String? expiry,
    int? quantity,
    String? dosage,
    int? daysToExpiry,
    bool? isExpired,
    String? manufacturer,
    String? hsn,
    String? mrp,
  }) {
    return Medicine(
      productName: productName ?? this.productName,
      batch: batch ?? this.batch,
      expiry: expiry ?? this.expiry,
      quantity: quantity ?? this.quantity,
      dosage: dosage ?? this.dosage,
      daysToExpiry: daysToExpiry ?? this.daysToExpiry,
      isExpired: isExpired ?? this.isExpired,
      manufacturer: manufacturer ?? this.manufacturer,
      hsn: hsn ?? this.hsn,
      mrp: mrp ?? this.mrp,
    );
  }
}