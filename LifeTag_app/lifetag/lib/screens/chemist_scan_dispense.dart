// lib/screens/chemist_scan_dispense.dart
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ChemistScanDispense extends StatefulWidget {
  const ChemistScanDispense({Key? key}) : super(key: key);

  @override
  State<ChemistScanDispense> createState() => _ChemistScanDispenseState();
}

class _ChemistScanDispenseState extends State<ChemistScanDispense> {
  late MobileScannerController controller;
  bool isScanned = false;
  bool torchOn = false;

  @override
  void initState() {
    super.initState();
    controller = MobileScannerController(
      facing: CameraFacing.back,
      detectionSpeed: DetectionSpeed.normal,
    );
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void handleBarcodeDetection(BarcodeCapture capture) {
    if (isScanned) return; // avoid multiple triggers
    if (capture.barcodes.isEmpty) return;

    final code = capture.barcodes.first.rawValue;
    if (code == null) return;

    setState(() => isScanned = true);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Scanned: $code'), backgroundColor: Colors.green),
    );

    // stop camera to prevent duplicate scans
    controller.stop();
  }

  Future<void> toggleTorch() async {
    try {
      await controller.toggleTorch();
      // If toggle succeeds flip local flag. If toggle throws, we show error.
      setState(() => torchOn = !torchOn);
    } catch (e) {
      // Some devices or API versions may not support torch toggle — handle gracefully
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Torch not available: ${e.toString()}')),
      );
    }
  }

  void scanAgain() {
    setState(() {
      isScanned = false;
    });
    controller.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.deepPurple,
        title: const Text('Scan Medicine QR', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: Icon(torchOn ? Icons.flash_on : Icons.flash_off, color: Colors.white),
            onPressed: toggleTorch,
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch, color: Colors.white),
            onPressed: () async {
              try {
                await controller.switchCamera();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Could not switch camera: ${e.toString()}')),
                );
              }
            },
          ),
        ],
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          MobileScanner(
            controller: controller,
            onDetect: handleBarcodeDetection,
          ),
          Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 2),
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          const Positioned(
            bottom: 40,
            child: Text(
              'Align the QR code within the box',
              style: TextStyle(color: Colors.white70),
            ),
          ),
        ],
      ),
      floatingActionButton: isScanned
          ? FloatingActionButton.extended(
              onPressed: scanAgain,
              label: const Text('Scan Again'),
              icon: const Icon(Icons.refresh),
              backgroundColor: Colors.deepPurple,
            )
          : null,
    );
  }
}
