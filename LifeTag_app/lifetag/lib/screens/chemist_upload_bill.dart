import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../api_service.dart';

class ChemistUploadScreen extends StatefulWidget {
  const ChemistUploadScreen({super.key});

  @override
  State<ChemistUploadScreen> createState() => _ChemistUploadScreenState();
}

class _ChemistUploadScreenState extends State<ChemistUploadScreen> {
  String? message;
  bool isUploading = false;

  Future<void> uploadFile() async {
    // Allow CSV and Excel file types
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv', 'xlsx', 'xls'],
    );

    if (result != null) {
      setState(() {
        isUploading = true;
        message = null;
      });

      final file = result.files.single;

      try {
        final resp = await ApiService.uploadBill(file.path!, "C001");
        setState(() {
          message = resp['message'] ?? "Upload successful!";
        });
      } catch (e) {
        setState(() {
          message = "Error uploading file: $e";
        });
      } finally {
        setState(() {
          isUploading = false;
        });
      }
    } else {
      setState(() {
        message = "No file selected.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Chemist: Upload Bill File")),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton.icon(
              onPressed: isUploading ? null : uploadFile,
              icon: const Icon(Icons.upload_file),
              label: Text(isUploading ? "Uploading..." : "Select CSV or Excel File"),
            ),
            const SizedBox(height: 16),
            if (message != null)
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(
                  message!,
                  style: TextStyle(
                    color: message!.toLowerCase().contains("error")
                        ? Colors.red
                        : Colors.green,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
