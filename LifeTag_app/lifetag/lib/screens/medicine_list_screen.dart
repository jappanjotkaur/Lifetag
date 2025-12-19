import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/medicine_provider.dart';
import '../widgets/medicine_card.dart';
import '../models/medicine.dart';

class MedicineListScreen extends StatefulWidget {
  const MedicineListScreen({Key? key}) : super(key: key);

  @override
  State<MedicineListScreen> createState() => _MedicineListScreenState();
}

class _MedicineListScreenState extends State<MedicineListScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) { // ✅ Make sure this is here
        context.read<MedicineProvider>().loadInventory();
      }
    });
  }


  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Medicine> _getFilteredMedicines(List<Medicine> medicines) {
    switch (_selectedFilter) {
      case 'expired':
        return medicines.where((m) => m.isExpired).toList();
      case 'expiring':
        return medicines.where((m) => m.isExpiringSoon && !m.isExpired).toList();
      case 'good':
        return medicines.where((m) => !m.isExpired && !m.isExpiringSoon).toList();
      default:
        return medicines;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Medicine Inventory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              context.read<MedicineProvider>().loadInventory();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search medicines...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          context.read<MedicineProvider>().clearSearch();
                          setState(() {});
                        },
                      )
                    : null,
              ),
              onChanged: (value) {
                if (value.isNotEmpty) {
                  context.read<MedicineProvider>().searchMedicine(value);
                } else {
                  context.read<MedicineProvider>().clearSearch();
                }
                setState(() {});
              },
            ),
          ),

          // Filter Chips
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All',
                    isSelected: _selectedFilter == 'all',
                    onTap: () => setState(() => _selectedFilter = 'all'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Expired',
                    isSelected: _selectedFilter == 'expired',
                    color: Colors.red,
                    onTap: () => setState(() => _selectedFilter = 'expired'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Expiring Soon',
                    isSelected: _selectedFilter == 'expiring',
                    color: Colors.orange,
                    onTap: () => setState(() => _selectedFilter = 'expiring'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Good',
                    isSelected: _selectedFilter == 'good',
                    color: Colors.green,
                    onTap: () => setState(() => _selectedFilter = 'good'),
                  ),
                ],
              ),
            ),
          ),

          // Medicine List
          Expanded(
            child: Consumer<MedicineProvider>(
              builder: (context, provider, child) {
                if (provider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (provider.error != null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          'Error loading medicines',
                          style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => provider.loadInventory(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final medicines = _searchController.text.isNotEmpty
                    ? provider.searchResults
                    : provider.inventory;

                final filteredMedicines = _getFilteredMedicines(medicines);

                if (filteredMedicines.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.medication_rounded, size: 64, color: Colors.grey[300]),
                        const SizedBox(height: 16),
                        Text(
                          'No medicines found',
                          style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredMedicines.length,
                  itemBuilder: (context, index) {
                    final medicine = filteredMedicines[index];
                    return MedicineCard(
                      medicine: medicine,
                      onTap: () => _showMedicineDetails(context, medicine),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showMedicineDetails(BuildContext context, Medicine medicine) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return SingleChildScrollView(
            controller: scrollController,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: medicine.isExpired
                              ? Colors.red.withValues(alpha: 0.1)
                              : medicine.isExpiringSoon
                                  ? Colors.orange.withValues(alpha: 0.1)
                                  : Colors.green.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          Icons.medication_rounded,
                          color: medicine.isExpired
                              ? Colors.red
                              : medicine.isExpiringSoon
                                  ? Colors.orange
                                  : Colors.green,
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              medicine.productName,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: medicine.isExpired
                                    ? Colors.red
                                    : medicine.isExpiringSoon
                                        ? Colors.orange
                                        : Colors.green,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                medicine.statusText,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 16),

                  // Details
                  _DetailRow(
                    label: 'Batch Number',
                    value: medicine.batch,
                    icon: Icons.qr_code_rounded,
                  ),
                  _DetailRow(
                    label: 'Expiry Date',
                    value: medicine.expiry,
                    icon: Icons.calendar_today_rounded,
                  ),
                  if (medicine.daysToExpiry != null)
                    _DetailRow(
                      label: 'Days to Expiry',
                      value: '${medicine.daysToExpiry} days',
                      icon: Icons.access_time_rounded,
                      valueColor: medicine.isExpired
                          ? Colors.red
                          : medicine.isExpiringSoon
                              ? Colors.orange
                              : Colors.green,
                    ),
                  _DetailRow(
                    label: 'Quantity Available',
                    value: '${medicine.quantity} units',
                    icon: Icons.inventory_2_rounded,
                  ),
                  if (medicine.manufacturer != null && medicine.manufacturer!.isNotEmpty)
                    _DetailRow(
                      label: 'Manufacturer',
                      value: medicine.manufacturer!,
                      icon: Icons.business_rounded,
                    ),
                  if (medicine.mrp != null && medicine.mrp!.isNotEmpty)
                    _DetailRow(
                      label: 'MRP',
                      value: '₹${medicine.mrp}',
                      icon: Icons.currency_rupee_rounded,
                    ),
                  if (medicine.hsn != null && medicine.hsn!.isNotEmpty)
                    _DetailRow(
                      label: 'HSN Code',
                      value: medicine.hsn!,
                      icon: Icons.tag_rounded,
                    ),

                  const SizedBox(height: 24),

                  // Warning Message
                  if (medicine.isExpired || medicine.isExpiringSoon)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: medicine.isExpired
                            ? Colors.red.withValues(alpha: 0.1)
                            : Colors.orange.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: medicine.isExpired
                              ? Colors.red.withValues(alpha: 0.3)
                              : Colors.orange.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.warning_amber_rounded,
                            color: medicine.isExpired ? Colors.red : Colors.orange,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              medicine.isExpired
                                  ? 'This medicine has expired. Do not consume.'
                                  : 'This medicine is expiring soon. Please check with your pharmacist.',
                              style: TextStyle(
                                color: medicine.isExpired ? Colors.red[900] : Colors.orange[900],
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 16),

                  // Close Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// Filter Chip Widget
class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color? color;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? Theme.of(context).primaryColor;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? chipColor : chipColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: chipColor.withValues(alpha: isSelected ? 1 : 0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : chipColor,
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

// Detail Row Widget
class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? valueColor;

  const _DetailRow({
    required this.label,
    required this.value,
    required this.icon,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
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
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: valueColor ?? Colors.black87,
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