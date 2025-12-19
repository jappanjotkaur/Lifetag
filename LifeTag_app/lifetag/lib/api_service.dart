// lib/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

const String baseUrl = "http://10.101.82.93:5000"; // use your PC LAN IP (include :5000 in URL only if needed by backend)

class ApiService {
  // -------------------------
  // PATIENT REGISTRATION
  // -------------------------
  static Future<Map<String, dynamic>> registerPatient(
      String name, String age, String gender, String contact) async {
    final res = await http.post(
      Uri.parse('$baseUrl/register_patient'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        "name": name,
        "age": age,
        "gender": gender,
        "contact": contact,
      }),
    );
    return _parseJsonSafe(res);
  }

  // -------------------------
  // LIST PATIENTS
  // -------------------------
  static Future<List<dynamic>> listPatients() async {
    final res = await http.get(Uri.parse('$baseUrl/list_patients'));
    return _parseJsonListSafe(res);
  }

  // -------------------------
  // CREATE PRESCRIPTION
  // -------------------------
  static Future<Map<String, dynamic>> createPrescription(
      String doctorId, String patientId, List<Map<String, dynamic>> meds) async {
    final res = await http.post(
      Uri.parse('$baseUrl/create_prescription'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        "doctor_id": doctorId,
        "patient_id": patientId,
        "medicines": meds,
      }),
    );
    return _parseJsonSafe(res);
  }

  // -------------------------
  // UPLOAD BILL (CSV / XLSX)
  // -------------------------
  static Future<Map<String, dynamic>> uploadBill(
      String filePath, String chemistId) async {
    var uri = Uri.parse('$baseUrl/upload_bill');
    var req = http.MultipartRequest('POST', uri);
    req.fields['chemist_id'] = chemistId;

    // contentType: accept common spreadsheet types
    final contentType = filePath.toLowerCase().endsWith('.csv')
        ? MediaType('text', 'csv')
        : MediaType('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    req.files.add(await http.MultipartFile.fromPath('file', filePath, contentType: contentType));
    var streamed = await req.send();
    var str = await streamed.stream.bytesToString();
    try {
      return jsonDecode(str) as Map<String, dynamic>;
    } catch (e) {
      return {"error": "Invalid response from server", "raw": str};
    }
  }

  // -------------------------
  // SCAN & DISPENSE (AUTO)
  // -------------------------
  // Flutter will send only the scanned QR code (prescription QR like "RX:...").
  // Backend will find medicines, update sales.csv and medicine_stock.csv and return result.
  static Future<Map<String, dynamic>> scanAndDispense(String code) async {
    final url = Uri.parse('$baseUrl/scan_dispense');
    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({"code": code}),
    );

    return _parseJsonSafe(res);
  }

  // -------------------------
  // GET PATIENT MEDICINES
  // -------------------------
  static Future<List<dynamic>> getPatientMeds(String patientId) async {
    final res = await http.get(
      Uri.parse('$baseUrl/get_patient_medicines?patient_id=$patientId'),
    );
    return _parseJsonListSafe(res);
  }

  // -------------------------
  // Helpers
  // -------------------------
  static Map<String, dynamic> _parseJsonSafe(http.Response res) {
    try {
      if (res.body.isEmpty) return {"error": "Empty response", "status": res.statusCode};
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) return decoded;
      return {"result": decoded, "status": res.statusCode};
    } catch (e) {
      return {"error": "Failed to parse JSON: $e", "raw": res.body, "status": res.statusCode};
    }
  }

  static List<dynamic> _parseJsonListSafe(http.Response res) {
    try {
      if (res.body.isEmpty) return [];
      final decoded = jsonDecode(res.body);
      if (decoded is List) return decoded;
      if (decoded is Map && decoded.containsKey('error')) throw Exception(decoded['error']);
      return [decoded];
    } catch (e) {
      return [{"error": "Failed to parse JSON list: $e", "raw": res.body}];
    }
  }
}
