import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/patient_provider.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key}); // ✅ Fixed: Using super parameter

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) { // ✅ Make sure this is here
        context.read<PatientProvider>().loadPatientData();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts & Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              context.read<PatientProvider>().refresh();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<PatientProvider>().refresh(),
        child: Consumer<PatientProvider>(
          builder: (context, provider, child) {
            if (provider.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (provider.alerts.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.notifications_none_rounded,
                      size: 80,
                      color: Colors.grey[300],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No active alerts',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'You\'ll be notified about medicine expiry and other important updates',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[500],
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: provider.alerts.length,
              itemBuilder: (context, index) {
                final alert = provider.alerts[index];
                return _AlertCard(
                  alert: alert,
                  onResolve: () async {
                    // ✅ Fixed: Store context before async gap
                    if (!context.mounted) return;
                    
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (dialogContext) => AlertDialog(
                        title: const Text('Resolve Alert'),
                        content: const Text(
                          'Have you taken action on this alert? This will mark it as resolved.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(dialogContext, false),
                            child: const Text('Cancel'),
                          ),
                          ElevatedButton(
                            onPressed: () => Navigator.pop(dialogContext, true),
                            child: const Text('Resolve'),
                          ),
                        ],
                      ),
                    );

                    if (!context.mounted) return; // ✅ Check mounted after async
                    
                    if (confirmed == true) {
                      final success = await provider.resolveAlert(
                        alert['alert_id'],
                      );

                      if (!context.mounted) return; // ✅ Check mounted again
                      
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            success
                                ? 'Alert resolved successfully'
                                : 'Failed to resolve alert',
                          ),
                          backgroundColor:
                              success ? Colors.green : Colors.red,
                        ),
                      );
                    }
                  },
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final Map<String, dynamic> alert;
  final VoidCallback onResolve;

  const _AlertCard({
    required this.alert,
    required this.onResolve,
  });

  @override
  Widget build(BuildContext context) {
    final alertType = alert['alert_type']?.toString().toLowerCase() ?? '';
    final isExpired = alertType.contains('expired') && !alertType.contains('expiring');
    final isExpiringSoon = alertType.contains('expiring');
    final isLowStock = alertType.contains('low');

    Color cardColor;
    Color iconColor;
    IconData icon;

    if (isExpired) {
      cardColor = Colors.red;
      iconColor = Colors.red;
      icon = Icons.error_rounded;
    } else if (isExpiringSoon) {
      cardColor = Colors.orange;
      iconColor = Colors.orange;
      icon = Icons.warning_amber_rounded;
    } else if (isLowStock) {
      cardColor = Colors.blue;
      iconColor = Colors.blue;
      icon = Icons.inventory_2_rounded;
    } else {
      cardColor = Colors.grey;
      iconColor = Colors.grey;
      icon = Icons.info_rounded;
    }

    final createdAt = alert['created_at']?.toString();
    String timeAgo = '';
    if (createdAt != null && createdAt.isNotEmpty) {
      try {
        final date = DateTime.parse(createdAt);
        final now = DateTime.now();
        final difference = now.difference(date);

        if (difference.inDays > 0) {
          timeAgo = '${difference.inDays}d ago';
        } else if (difference.inHours > 0) {
          timeAgo = '${difference.inHours}h ago';
        } else if (difference.inMinutes > 0) {
          timeAgo = '${difference.inMinutes}m ago';
        } else {
          timeAgo = 'Just now';
        }
      } catch (e) {
        timeAgo = '';
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: cardColor.withValues(alpha: 0.3), // ✅ Fixed: Using withValues
          width: 2,
        ),
      ),
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
                    color: cardColor.withValues(alpha: 0.1), // ✅ Fixed: Using withValues
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: iconColor, size: 28),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        alert['product_name']?.toString() ?? 'Unknown Medicine',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: cardColor,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              alertType.toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (timeAgo.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Text(
                              timeAgo,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),
            _InfoRow(
              icon: Icons.qr_code_rounded,
              label: 'Batch',
              value: alert['batch']?.toString() ?? 'N/A',
            ),
            _InfoRow(
              icon: Icons.calendar_today_rounded,
              label: 'Expiry',
              value: alert['exp']?.toString() ?? 'N/A',
            ),
            if (alert['days_to_expiry'] != null)
              _InfoRow(
                icon: Icons.access_time_rounded,
                label: 'Days Left',
                value: '${alert['days_to_expiry']} days',
                valueColor: isExpired ? Colors.red : Colors.orange,
              ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onResolve,
                icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
                label: const Text('Mark as Resolved'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: cardColor.withValues(alpha: 0.1), // ✅ Fixed: Using withValues
                  foregroundColor: cardColor,
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: valueColor ?? Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }
}