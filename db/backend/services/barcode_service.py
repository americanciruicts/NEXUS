import os
import qrcode
from barcode import Code128
from barcode.writer import ImageWriter
from io import BytesIO
import base64
from PIL import Image

class BarcodeService:
    """Service for generating barcodes and QR codes for travelers"""

    @staticmethod
    def generate_traveler_barcode(traveler_id: int, job_number: str, work_order: str = "") -> str:
        """Generate a barcode for a traveler - only job number"""
        # Create barcode with only job number
        barcode_data = job_number

        try:
            # Generate Code128 barcode with options for better rectangle shape
            writer_options = {
                'module_height': 10,      # Height of barcode bars (smaller)
                'module_width': 0.3,      # Width of individual bars
                'font_size': 10,          # Font size for text
                'text_distance': 5,       # Distance between barcode and text (more space)
                'quiet_zone': 4,          # Margin around barcode
            }

            code128 = Code128(barcode_data, writer=ImageWriter())
            buffer = BytesIO()
            code128.write(buffer, options=writer_options)

            # Convert to base64 for easy storage and transmission
            buffer.seek(0)
            barcode_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            return barcode_base64

        except Exception as e:
            print(f"Error generating barcode: {str(e)}")
            return ""

    @staticmethod
    def generate_qr_code(traveler_id: int, job_number: str, part_number: str) -> str:
        """Generate a QR code containing traveler information"""
        qr_data = {
            "traveler_id": traveler_id,
            "job_number": job_number,
            "part_number": part_number,
            "system": "NEXUS",
            "company": "American Circuits"
        }

        # Convert to string format for QR code
        qr_string = f"NEXUS|{traveler_id}|{job_number}|{part_number}|AC"

        try:
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_string)
            qr.make(fit=True)

            # Create QR code image
            qr_image = qr.make_image(fill_color="black", back_color="white")

            # Convert to base64
            buffer = BytesIO()
            qr_image.save(buffer, format='PNG')
            buffer.seek(0)
            qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            return qr_base64

        except Exception as e:
            print(f"Error generating QR code: {str(e)}")
            return ""

    @staticmethod
    def parse_barcode(barcode_data: str) -> dict:
        """Parse barcode data to extract traveler information"""
        try:
            # Expected formats:
            # NEX-XXXXXX-JOBNUMBER-WORKORDER (new format with work order)
            # NEX-XXXXXX-JOBNUMBER (legacy format)
            if not barcode_data.startswith("NEX-"):
                return {"error": "Invalid barcode format"}

            parts = barcode_data.split("-")
            if len(parts) < 3:
                return {"error": "Invalid barcode structure"}

            traveler_id = int(parts[1])

            # Check if work order is present (4 or more parts)
            if len(parts) >= 4:
                job_number = parts[2]
                work_order = "-".join(parts[3:])  # Join remaining parts as work order
                return {
                    "traveler_id": traveler_id,
                    "job_number": job_number,
                    "work_order": work_order,
                    "valid": True
                }
            else:
                job_number = "-".join(parts[2:])  # Join remaining parts as job number
                return {
                    "traveler_id": traveler_id,
                    "job_number": job_number,
                    "valid": True
                }

        except Exception as e:
            return {"error": f"Failed to parse barcode: {str(e)}"}

    @staticmethod
    def generate_step_qr_code(traveler_id: int, job_number: str, work_center: str, step_id: int = None, step_type: str = "PROCESS", step_number: int = None, operation: str = "", work_order: str = "") -> str:
        """Generate a smaller QR code for a specific routing table step with ONLY work center name

        Args:
            traveler_id: The traveler ID
            job_number: The job number
            work_center: The work center code
            step_id: Optional step ID for tracking
            step_type: Type of step - "PROCESS" or "MANUAL"
            step_number: Step sequence number
            operation: Operation description
            work_order: Work order number
        """
        # Simplified format: QR code only contains work center name for easy scanning
        qr_string = work_center

        try:
            # Generate smaller QR code with higher error correction for better scannability
            qr = qrcode.QRCode(
                version=1,  # Smallest version
                error_correction=qrcode.constants.ERROR_CORRECT_H,  # Highest error correction
                box_size=4,  # Smaller box size (was 10)
                border=2,   # Smaller border (was 4)
            )
            qr.add_data(qr_string)
            qr.make(fit=True)

            # Create QR code image
            qr_image = qr.make_image(fill_color="black", back_color="white")

            # Convert to base64
            buffer = BytesIO()
            qr_image.save(buffer, format='PNG')
            buffer.seek(0)
            qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            return qr_base64

        except Exception as e:
            print(f"Error generating step QR code: {str(e)}")
            return ""

    @staticmethod
    def parse_qr_code(qr_data: str) -> dict:
        """Parse QR code data to extract traveler information"""
        try:
            # Check if it's a step-specific QR code
            if qr_data.startswith("NEXUS-STEP|"):
                return BarcodeService.parse_step_qr_code(qr_data)

            # Expected format: NEXUS|traveler_id|job_number|part_number|AC
            parts = qr_data.split("|")
            if len(parts) < 5 or parts[0] != "NEXUS":
                return {"error": "Invalid QR code format"}

            return {
                "type": "traveler",
                "system": parts[0],
                "traveler_id": int(parts[1]),
                "job_number": parts[2],
                "part_number": parts[3],
                "company": parts[4],
                "valid": True
            }

        except Exception as e:
            return {"error": f"Failed to parse QR code: {str(e)}"}

    @staticmethod
    def parse_step_qr_code(qr_data: str) -> dict:
        """Parse step-specific QR code data"""
        try:
            # Expected formats (NEW):
            # NEXUS-STEP|traveler_id|job_number|work_order|work_center|step_number|operation|step_type|step_id|AC
            # NEXUS-STEP|traveler_id|job_number|work_order|work_center|step_number|operation|step_type|AC
            #
            # Legacy formats (for backward compatibility):
            # NEXUS-STEP|traveler_id|job_number|work_center|step_type|AC
            # NEXUS-STEP|traveler_id|job_number|work_center|step_type|step_id|AC
            parts = qr_data.split("|")
            if len(parts) < 6 or parts[0] != "NEXUS-STEP":
                return {"error": "Invalid step QR code format"}

            # Check if new format (has work_order field and more parts)
            if len(parts) >= 9:
                # New format with all fields
                result = {
                    "type": "step",
                    "system": "NEXUS",
                    "traveler_id": int(parts[1]),
                    "job_number": parts[2],
                    "work_order": parts[3],
                    "work_center": parts[4],
                    "step_number": int(parts[5]) if parts[5] else None,
                    "operation": parts[6],
                    "step_type": parts[7],
                    "valid": True
                }

                # Check if step_id is included
                if len(parts) == 11:
                    result["step_id"] = int(parts[8]) if parts[8] else None
                    result["company"] = parts[9]
                else:
                    result["company"] = parts[8]

                return result
            else:
                # Legacy format
                result = {
                    "type": "step",
                    "system": "NEXUS",
                    "traveler_id": int(parts[1]),
                    "job_number": parts[2],
                    "work_order": "",
                    "work_center": parts[3],
                    "step_type": parts[4],
                    "valid": True
                }

                # Check if step_id is included (7 parts total)
                if len(parts) == 7:
                    result["step_id"] = int(parts[5])
                    result["company"] = parts[6]
                else:
                    result["company"] = parts[5]

                return result

        except Exception as e:
            return {"error": f"Failed to parse step QR code: {str(e)}"}

    @staticmethod
    def generate_traveler_label(traveler_data: dict) -> str:
        """Generate a complete traveler label with barcode, QR code, and information"""
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.units import inch

            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=(4*inch, 6*inch))  # 4x6 label size

            # Title
            p.setFont("Helvetica-Bold", 16)
            p.drawString(0.25*inch, 5.5*inch, "NEXUS TRAVELER")

            # Company info
            p.setFont("Helvetica", 12)
            p.drawString(0.25*inch, 5.2*inch, "American Circuits")

            # Traveler information
            p.setFont("Helvetica-Bold", 10)
            p.drawString(0.25*inch, 4.8*inch, f"Job Number: {traveler_data['job_number']}")
            p.drawString(0.25*inch, 4.6*inch, f"Part Number: {traveler_data['part_number']}")
            p.drawString(0.25*inch, 4.4*inch, f"Description: {traveler_data['part_description']}")
            p.drawString(0.25*inch, 4.2*inch, f"Revision: {traveler_data['revision']}")
            p.drawString(0.25*inch, 4.0*inch, f"Quantity: {traveler_data['quantity']}")

            # Barcode area (would need actual barcode image insertion)
            p.setFont("Helvetica", 8)
            p.drawString(0.25*inch, 3.6*inch, "Barcode:")
            p.rect(0.25*inch, 2.8*inch, 3.5*inch, 0.6*inch)

            # Traveler ID
            p.setFont("Helvetica-Bold", 12)
            p.drawString(0.25*inch, 2.4*inch, f"Traveler ID: {traveler_data['traveler_id']}")

            # QR Code area
            p.setFont("Helvetica", 8)
            p.drawString(0.25*inch, 2.0*inch, "QR Code:")
            p.rect(0.25*inch, 0.5*inch, 1.5*inch, 1.5*inch)

            # Footer
            p.setFont("Helvetica", 8)
            p.drawString(0.25*inch, 0.25*inch, f"Generated: {traveler_data.get('created_at', 'N/A')}")

            p.save()
            buffer.seek(0)
            pdf_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            return pdf_base64

        except Exception as e:
            print(f"Error generating traveler label: {str(e)}")
            return ""

    @staticmethod
    def generate_unique_traveler_id() -> str:
        """Generate a unique traveler identifier"""
        import uuid
        import datetime

        # Create unique ID with timestamp and random component
        now = datetime.datetime.now()
        unique_id = f"{now.strftime('%y%m%d')}{now.strftime('%H%M%S')}{str(uuid.uuid4())[:6].upper()}"

        return unique_id