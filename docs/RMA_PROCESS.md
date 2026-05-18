# RMA Process — Preet's SOP

Standard operating procedure for handling RMAs (Returned Material Authorizations) at ACI. Covers commonly-used traveler steps and the end-to-end workflow from RMA issuance through shipping.

Related NEXUS traveler types: `RMA_SAME` (same job/PO/WO), `RMA_DIFF` (different job/PO/WO), `MODIFICATION`.

---

## Commonly Used RMA Steps

These are the step options typically added to an RMA traveler. Add or remove based on what the customer needs and what was on the original build traveler.

1. **Customer Approval**
2. **Detailed Inspection** — sample or 100%
3. **Incoming Inspection**
4. **Testing**
5. **Programming**
6. **Troubleshooting**
7. **Repair**
8. **Interim Inspection**
9. **Inventory** — check parts before buying
10. **Purchasing** — parts ordered, waiting for receipt before repair
11. **Misc.**
12. **Final Inspection** — sample or 100%
13. **Invoicing** — credit on receive, charge on ship (Add-On and Chemring only)
14. **Quality** — boards ship with CofC (Chemring only)
15. **Stock** — check for existing PCBA / cable assemblies in stock
16. **Labelling**
17. **Shipping**

---

## End-to-End Process

### 1. RMA Intake

1. **Larry issues RMA number.**
2. When the RMA is physically received:
   - Open the box, remove packing, inspect.
   - Verify quantity against what the customer stated in their email.
   - Ask Bharat (or someone) to unwrap and count.

### 2. Folder & Documentation Setup

3. Create a folder inside the customer's folder at:
   `\\ACI-SERV2\ACI Job Files\ISO Certification\Returns`
   Folder name should include: **RMA number, job number, customer name, customer part number.**
4. Save the customer's RMA email into the folder (for everyone's reference).
5. Scan any paper documents the customer sent with the RMA.
6. Take photos of PCBAs and cable assemblies — mark faulty locations with red arrows for future reference.
7. Check the original traveler — also pull stock boards for the same repair if the issue is consistent across boards.

### 3. Return Report (OTD Sheet)

8. Update **Return Report Rev B** on the OTD sheet.
   - Add Customer NCR/PO, Work Order, units shipped, units scrapped.
   - Add customer part number in the notes column.
   - Add dates, board location, board serial numbers, and the fault for each.
   - If too many boards: write **"see traveler."**

### 4. Create the RMA Traveler

9. Use the **New RMA Router** template at:
   `Y:\ISO Certification\Returns\00000 Blank RMA Router & Procedure`
10. Rename the router and fill in the header (check the traveler folder for PO/WO numbers).
11. Log all serial numbers and their failure info — copy/paste from the customer email or the OTD Return Report.
12. Add general comments/notes that apply to all units (see notes section on the OTD returns report sheet).
13. **Customize the steps** for this RMA:
    - Review the [commonly-used steps](#commonly-used-rma-steps) above.
    - Check the original build traveler to see what was originally done (testing, programming, coating, etc.).
    - Add/remove steps as needed.

### 5. Quick Inspection

14. Quick inspect / verify for: shorts, opens, burned-out parts, missing parts, polarity, anything weird.
    - If nothing found, note: **"No Defects Found"** or **"No visual defects found."**

### 6. PCBA / CA Inspection

15. If the customer **doesn't know what's wrong:**
    - First do a detailed QC inspection.
    - If nothing is found → send for testing and troubleshooting.
16. If the customer **does know what's wrong:**
    - Skip QC inspection, go straight to repair.
17. Note any additional issues found during inspection.
18. If a deeper inspection is needed, add an **Incoming Inspection** step on the traveler for Maria (or someone) to handle.
19. Make a recommendation in the **Disposition of unit** column if needed.

### 7. Finalize Paperwork

20. Copy the traveler PDF to the RMA folder (for tracing date codes later).
21. Print and verify all details.
22. Print supporting documents (BOM, customer-supplied info, etc.) and staple them to the traveler.
23. Move the boards to the QC area on the floor.
24. Add the RMA to:
    - **Daily tracking log** on the Jobs and Priorities Excel workbook.
    - **RMA issue tracking** by board SN & Customer Excel workbook.

### 8. Release Email to Production

25. Email **Kris**, cc **Larry**, that the RMA is ready. Attach the RMA traveler and any customer details.

   **Email Template 1:**
   > RMA job is released and ready for production to work on.
   > RMA traveler is created, attached, and printed.
   > Cable assembly or PCBAs are being moved to Colleen's / Daniel's / Cable / Adam's / John's area.

   **Cc as needed:**
   - **Daniel** — if testing or troubleshooting is needed.
   - **Alex / Adam** — if a BOM update is required.
   - **Teresa** — to check stock if parts are needed for repair.

### 9. Customer-Specific Requirements

26. **Add-On and Chemring RMAs:**
    - Email **Praful, Julia, Larry**.
    - On receive → give them credit.
    - On ship → charge them back.
27. **Chemring RMAs only:**
    - Require **CofC (Certificate of Conformance)** when shipping.

### 10. Notify Customer

28. Email the customer to confirm RMA receipt and ask if any other info is needed.

### 11. After Repair

29. Once the boards are fixed, inspect them.
30. Update the **OTD Returns sheet** with the ship date and whether we **repaired, replaced, or refunded**.
31. **If scrapping:** update the OTD Returns sheet with scrapped unit count and move them to the scrap box.
32. **If issuing credit (can't fix):**
    - Sign, date, and initial the RMA traveler.
    - Check with **Julia or Accounting** about credit issued or payment received **before** issuing credit.
33. **Add-On / Chemring:** email Praful, Julia, Larry on ship-out (credit/charge as applicable).
34. **Chemring:** include the **CofC** with the shipment.

### 12. Post-Closure Items

35. Determine if any of the following are required:
    - **SCAR** (Supplier Corrective Action Request)
    - **CAR** (Corrective Action Request)
    - **PAR** (Preventive Action Request)
    - **BOM update**

---

## Quick Reference: Customer Special Handling

| Customer | Special Requirement |
|----------|---------------------|
| **Add-On** | Email Praful, Julia, Larry on receive (credit) and ship (charge) |
| **Chemring** | Same as Add-On + ship with CofC |
| **All others** | Standard flow |

---

## Reference Documents

- `New RMA Router- came from same jobs or revision, PO & WO.docx` — template for same-job RMAs
- `New RMA Router- came from different jobs or revision, PO & WO.docx` — template for cross-job RMAs
- `New Modification Router.docx` — template for modification RMAs
- Blank router source: `Y:\ISO Certification\Returns\00000 Blank RMA Router & Procedure`
