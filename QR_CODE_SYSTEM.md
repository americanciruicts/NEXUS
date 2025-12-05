# QR Code System Documentation

## Overview

The Nexus system uses **two types of QR codes** to track travelers through the manufacturing process:

1. **Traveler Header QR Code** - Identifies the overall traveler/job
2. **Step-Specific QR Codes** - Unique codes for each routing table step

---

## 1. Traveler Header QR Code (Barcode)

### Purpose
Identifies the main traveler document with job and part information.

### Contents
- Traveler ID
- Job Number
- Part Number
- System Identifier ("NEXUS")
- Company Name ("AC")

### Format
```
NEXUS|{traveler_id}|{job_number}|{part_number}|AC
```

### Example
```
NEXUS|123|JOB-2024-001|PART-456|AC
```

### API Endpoints

**Generate Traveler QR Code:**
```
GET /api/barcodes/traveler/{traveler_id}
```

**Scan Traveler QR Code:**
```
POST /api/barcodes/scan/qr
Body: {
  "qr_code": "NEXUS|123|JOB-2024-001|PART-456|AC"
}
```

---

## 2. Step-Specific QR Codes

### Purpose
- Track progress through each manufacturing step
- Measure time spent at each work center
- Support scan-in/scan-out for labor tracking

### Contents
- Traveler ID
- Job Number
- Work Center Code
- Step Type (PROCESS or MANUAL)
- Step ID
- Company Name

### Format
```
NEXUS-STEP|{traveler_id}|{job_number}|{work_center}|{step_type}|{step_id}|AC
```

### Examples

**Process Step (Standard Manufacturing Step):**
```
NEXUS-STEP|123|JOB-2024-001|ENGINEERING|PROCESS|5|AC
```

**Manual Step (Custom Step):**
```
NEXUS-STEP|123|JOB-2024-001|CUSTOM|MANUAL|12|AC
```

### Work Center Examples
- `ENGINEERING` - Engineering department
- `ASSEMBLY` - Assembly work center
- `TESTING` - Testing/QA work center
- `INSPECTION` - Inspection work center
- `CUSTOM` - Used for manual/custom steps

---

## 3. Step QR Code API Endpoints

### Generate QR Code for Single Step
```
GET /api/barcodes/step/{step_id}/qr
```

**Response:**
```json
{
  "step_id": 5,
  "traveler_id": 123,
  "job_number": "JOB-2024-001",
  "work_center": "ENGINEERING",
  "operation": "Design Review",
  "step_number": 1,
  "qr_code_image": "base64_encoded_image",
  "qr_data": "NEXUS-STEP|123|JOB-2024-001|ENGINEERING|PROCESS|5|AC"
}
```

### Generate QR Codes for All Steps in a Traveler
```
GET /api/barcodes/traveler/{traveler_id}/steps-qr?include_manual=true
```

**Response:**
```json
{
  "traveler_id": 123,
  "job_number": "JOB-2024-001",
  "total_process_steps": 5,
  "total_manual_steps": 2,
  "process_steps": [
    {
      "step_id": 5,
      "step_type": "PROCESS",
      "step_number": 1,
      "operation": "Engineering Review",
      "work_center": "ENGINEERING",
      "qr_code_image": "base64...",
      "qr_data": "NEXUS-STEP|123|JOB-2024-001|ENGINEERING|PROCESS|5|AC"
    }
  ],
  "manual_steps": [
    {
      "step_id": 12,
      "step_type": "MANUAL",
      "description": "Special inspection",
      "work_center": "CUSTOM",
      "qr_code_image": "base64...",
      "qr_data": "NEXUS-STEP|123|JOB-2024-001|CUSTOM|MANUAL|12|AC"
    }
  ]
}
```

---

## 4. Scan-In / Scan-Out System

### Purpose
Track when workers start and finish work at each step to measure time spent.

### Workflow

1. **Worker arrives at step** → Scans QR code with action `SCAN_IN`
2. **Worker completes step** → Scans QR code with action `SCAN_OUT`
3. **System calculates** → Duration between scan-in and scan-out

### Scan Step Endpoint
```
POST /api/barcodes/scan/step
```

**Request Body:**
```json
{
  "qr_code": "NEXUS-STEP|123|JOB-2024-001|ENGINEERING|PROCESS|5|AC",
  "scan_action": "SCAN_IN",
  "notes": "Starting engineering review"
}
```

**Response:**
```json
{
  "success": true,
  "scan_id": 789,
  "traveler_id": 123,
  "job_number": "JOB-2024-001",
  "step_id": 5,
  "step_type": "PROCESS",
  "work_center": "ENGINEERING",
  "scan_action": "SCAN_IN",
  "scanned_at": "2024-10-13T10:30:00Z",
  "scanned_by": "john.doe",
  "duration_minutes": null
}
```

**Scan Out Response (includes duration):**
```json
{
  "success": true,
  "scan_id": 790,
  "traveler_id": 123,
  "job_number": "JOB-2024-001",
  "step_id": 5,
  "step_type": "PROCESS",
  "work_center": "ENGINEERING",
  "scan_action": "SCAN_OUT",
  "scanned_at": "2024-10-13T12:45:00Z",
  "scanned_by": "john.doe",
  "duration_minutes": 135.0
}
```

---

## 5. Time Tracking & Reports

### Get Scan History for a Step
```
GET /api/barcodes/step/{step_id}/scan-history?step_type=PROCESS
```

**Response:**
```json
{
  "step_id": 5,
  "step_type": "PROCESS",
  "total_scans": 4,
  "total_time_minutes": 135.0,
  "total_time_hours": 2.25,
  "scan_pairs": [
    {
      "scan_in_at": "2024-10-13T10:30:00Z",
      "scan_out_at": "2024-10-13T12:45:00Z",
      "duration_minutes": 135.0,
      "scanned_by": "john.doe"
    }
  ]
}
```

### Get Time Summary for Entire Traveler
```
GET /api/barcodes/traveler/{traveler_id}/time-summary
```

**Response:**
```json
{
  "traveler_id": 123,
  "job_number": "JOB-2024-001",
  "total_time_minutes": 480.0,
  "total_time_hours": 8.0,
  "steps": [
    {
      "step_id": 5,
      "step_number": 1,
      "operation": "Engineering Review",
      "work_center": "ENGINEERING",
      "time_minutes": 135.0,
      "time_hours": 2.25,
      "status": "completed",
      "scan_count": 2
    },
    {
      "step_id": 6,
      "step_number": 2,
      "operation": "Assembly",
      "work_center": "ASSEMBLY",
      "time_minutes": 0,
      "time_hours": 0,
      "status": "not_started",
      "scan_count": 0
    }
  ]
}
```

---

## 6. Database Schema

### Table: step_scan_events

Stores all scan-in and scan-out events for tracking time at each step.

```sql
CREATE TABLE step_scan_events (
    id SERIAL PRIMARY KEY,
    traveler_id INTEGER NOT NULL,
    step_id INTEGER NOT NULL,
    step_type VARCHAR(20) NOT NULL,  -- 'PROCESS' or 'MANUAL'
    job_number VARCHAR(50) NOT NULL,
    work_center VARCHAR(100) NOT NULL,
    scan_action VARCHAR(20) NOT NULL,  -- 'SCAN_IN' or 'SCAN_OUT'
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scanned_by INTEGER REFERENCES users(id),
    notes TEXT,
    duration_minutes FLOAT  -- Calculated on SCAN_OUT
);
```

---

## 7. Key Differences Summary

| Feature | Traveler QR Code | Step QR Code |
|---------|-----------------|--------------|
| **Purpose** | Identify traveler/job | Track step progress & time |
| **Uniqueness** | One per traveler | One per step (unique) |
| **Contains** | Part number | Work center |
| **Usage** | General identification | Scan-in/scan-out tracking |
| **Format Prefix** | `NEXUS\|` | `NEXUS-STEP\|` |
| **Supports Custom Steps** | No | Yes (MANUAL type) |

---

## 8. Implementation Notes

### Unique QR Codes for Each Step
- Every ProcessStep gets a unique QR code with its step_id
- Every ManualStep (custom step) gets a unique QR code with its step_id
- Manual steps use "CUSTOM" as the work_center identifier

### Time Calculation
- Duration is calculated automatically when SCAN_OUT occurs
- System finds the most recent SCAN_IN for that step
- Time difference is stored in `duration_minutes` field

### Work Center Tracking
- Each step QR code includes the work center information
- Allows tracking which department/area has the traveler
- Reports can be generated by work center

---

## 9. Frontend Integration

### Displaying QR Codes
QR codes are returned as base64-encoded PNG images and can be displayed directly in HTML:

```html
<img src="data:image/png;base64,{qr_code_image}" alt="Step QR Code" />
```

### Scanning QR Codes
Use a barcode/QR scanner library (like `html5-qrcode` or `react-qr-reader`) to scan codes and send them to the API.

---

## 10. Security Considerations

- All QR code endpoints require authentication
- Scan events are associated with the authenticated user
- Job number validation ensures QR codes match the correct traveler
- Step existence is verified before recording scan events

---

## Support

For issues or questions about the QR code system, contact the development team or refer to the main system documentation.
