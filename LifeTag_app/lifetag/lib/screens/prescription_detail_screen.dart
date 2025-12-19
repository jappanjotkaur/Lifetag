import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/prescription.dart';
import '../services/api_service.dart';

class PrescriptionDetailScreen extends StatefulWidget {
  final String prescriptionId;

  const PrescriptionDetailScreen({
    Key? key,
    required this.prescriptionId,
  }) : super(key: key);

  @override
  State<PrescriptionDetailScreen> createState() =>
      _PrescriptionDetailScreenState();
}

class _PrescriptionDetailScreenState extends State<PrescriptionDetailScreen> {
  bool _isLoading = true;
  Prescription? _prescription;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPrescription();
  }

  Future<void> _loadPrescription() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final prescription =
          await ApiService().getPrescription(widget.prescriptionId);
      setState(() {
        _prescription = prescription;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Prescription Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadPrescription,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline,
                          size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        'Error loading prescription',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _loadPrescription,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _buildPrescriptionContent(),
    );
  }

  Widget _buildPrescriptionContent() {
    if (_prescription == null) {
      return const Center(child: Text('No prescription data'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: _prescription!.isDispensed
                  ? Colors.green
                  : Colors.blue,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _prescription!.isDispensed
                      ? Icons.check_circle_rounded
                      : Icons.pending_rounded,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  _prescription!.isDispensed ? 'DISPENSED' : 'PENDING',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Prescription Info Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Prescription Information',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _InfoRow(
                    icon: Icons.badge_rounded,
                    label: 'Prescription ID',
                    value: _prescription!.prescriptionId,
                  ),
                  _InfoRow(
                    icon: Icons.medical_services_rounded,
                    label: 'Doctor',
                    value: 'Dr. ${_prescription!.doctorName}',
                  ),
                  _InfoRow(
                    icon: Icons.local_pharmacy_rounded,
                    label: 'Pharmacy',
                    value: _prescription!.pharmacyId,
                  ),
                  _InfoRow(
                    icon: Icons.calendar_today_rounded,
                    label: 'Created',
                    value: _formatDate(_prescription!.createdAt),
                  ),
                  if (_prescription!.dispensedAt != null)
                    _InfoRow(
                      icon: Icons.check_circle_outline_rounded,
                      label: 'Dispensed',
                      value: _formatDate(_prescription!.dispensedAt!),
                    ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // QR Code
          if (_prescription!.qrPath != null &&
              _prescription!.qrPath!.isNotEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    const Text(
                      'QR Code',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: CachedNetworkImage(
                        imageUrl: ApiService()
                            .getQrCodeUrl(_prescription!.qrPath!),
                        width: 200,
                        height: 200,
                        placeholder: (context, url) =>
                            const CircularProgressIndicator(),
                        errorWidget: (context, url, error) => Container(
                          width: 200,
                          height: 200,
                          color: Colors.grey[200],
                          child: const Icon(Icons.error, size: 48),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Show this QR code at the pharmacy',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 24),

          // Medicines List
          const Text(
            'Prescribed Medicines',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          if (_prescription!.medications.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Text(
                    'No medicines in this prescription',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ),
              ),
            )
          else
            ...List.generate(_prescription!.medications.length, (index) {
              final medicine = _prescription!.medications[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: medicine.isExpired
                                  ? Colors.red.withValues(alpha: 0.1)
                                  : medicine.isExpiringSoon
                                      ? Colors.orange.withValues(alpha: 0.1)
                                      : Colors.green.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              Icons.medication_rounded,
                              color: medicine.isExpired
                                  ? Colors.red
                                  : medicine.isExpiringSoon
                                      ? Colors.orange
                                      : Colors.green,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  medicine.productName,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                if (medicine.isExpired || medicine.isExpiringSoon)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: medicine.isExpired
                                          ? Colors.red
                                          : Colors.orange,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      medicine.statusText,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(),
                      const SizedBox(height: 8),
                      _MedicineDetailRow(
                        label: 'Batch',
                        value: medicine.batch,
                      ),
                      _MedicineDetailRow(
                        label: 'Expiry',
                        value: medicine.expiry,
                      ),
                      _MedicineDetailRow(
                        label: 'Quantity',
                        value: '${medicine.quantity} units',
                      ),
                      if (medicine.dosage != null && medicine.dosage!.isNotEmpty)
                        _MedicineDetailRow(
                          label: 'Dosage',
                          value: medicine.dosage!,
                        ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MedicineDetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _MedicineDetailRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}