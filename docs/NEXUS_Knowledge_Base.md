# Nexus Application — Knowledge Base

**Document Title:** Nexus Platform — End-to-End User Workflow & Knowledge Base
**Version:** 1.0
**Last Updated:** March 16, 2026
**Classification:** Internal — All Stakeholders
**Owner:** American Circuits, Inc. (ACI)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Access Methods](#2-system-access-methods)
3. [User Journey Overview](#3-user-journey-overview)
4. [Step-by-Step User Workflow](#4-step-by-step-user-workflow)
5. [Detailed Feature Explanations](#5-detailed-feature-explanations)
6. [Example End-to-End User Scenario](#6-example-end-to-end-user-scenario)
7. [Error Handling and Common Issues](#7-error-handling-and-common-issues)
8. [Best Practices for Users](#8-best-practices-for-users)
9. [Appendix](#9-appendix)

---

## 1. Introduction

### 1.1 What Is Nexus?

Nexus is a **Digital Traveler Management and Manufacturing Operations Platform** developed for American Circuits, Inc. (ACI). It replaces paper-based manufacturing travelers with a fully digital system that tracks PCB assemblies, cables, and mechanical components throughout the entire production lifecycle.

The platform provides real-time tracking of job progress, labor hours, quality metrics, and multi-level approval workflows — all accessible from a web browser on desktop or shop-floor devices.

### 1.2 Who Uses Nexus?

| Role | Description |
|------|-------------|
| **Administrators** | Full system access. Manage users, travelers, labor entries, work centers, and approvals. |
| **Operators** | Shop-floor personnel. Create travelers, track labor hours, scan barcodes, and request approvals. |
| **Approvers** | Designated reviewers (typically supervisors). Approve or reject traveler edits, completions, and cancellations. |

### 1.3 What Problems Does Nexus Solve?

- **Eliminates paper travelers** — Digital records replace physical documents that can be lost, damaged, or out of date.
- **Real-time labor tracking** — Operators clock in and out of process steps with timers or barcode scans, giving management live visibility into production hours.
- **Approval governance** — Structured approval workflows ensure that edits, completions, and cancellations go through authorized reviewers.
- **Traceability** — Every change is recorded in an audit log with user, timestamp, and field-level detail.
- **Barcode and QR integration** — Each traveler and process step has a unique barcode/QR code for fast scanning on the shop floor.
- **Cross-platform access** — Nexus integrates with ACI Forge via Single Sign-On, allowing seamless access from the central ACI dashboard.

---

## 2. System Access Methods

Users can access Nexus through two authentication paths.

### 2.1 Login via ACI Forge (Single Sign-On)

This is the recommended method for users who already have an ACI Forge account.

**Flow:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User logs   │     │ User clicks  │     │ Forge issues │     │ Nexus creates│
│  into ACI    │────>│ "Nexus" on   │────>│ short-lived  │────>│ local JWT    │
│  Forge       │     │ Forge dash   │     │ SSO token    │     │ session      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Detailed Steps:**

1. The user logs into ACI Forge with their Forge credentials.
2. On the Forge dashboard, the user clicks the **Nexus** application tile.
3. Forge generates a short-lived SSO token (valid for 60 seconds) signed with a shared secret key.
4. The user's browser is redirected to `<nexus-url>/sso/callback?token=<sso_token>`.
5. The Nexus frontend sends the SSO token to the Nexus backend (`POST /auth/sso/callback`).
6. The Nexus backend validates the token signature and expiration.
7. If valid, Nexus issues its own JWT session token (8-hour expiry) and logs the user in.
8. The user is redirected to the Nexus dashboard.
9. A login notification is sent to Nexus administrators.

**Prerequisites:**
- The user must have an active ACI Forge account.
- The Forge administrator must have granted the user access to the Nexus tool.
- When a user is created in Forge with Nexus access, their account is automatically synchronized to the Nexus database.

### 2.2 Direct Login to Nexus

Users who access Nexus independently (without going through Forge) use the direct login page.

**Flow:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ User opens   │     │ User enters  │     │ Nexus issues │
│ Nexus login  │────>│ username &   │────>│ JWT session  │
│ page         │     │ password     │     │ token        │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Detailed Steps:**

1. The user navigates to the Nexus login page (`<nexus-url>/auth/login`).
2. The user enters their username and password.
3. The frontend sends credentials to the backend (`POST /auth/login`).
4. The backend validates the password using bcrypt hashing.
5. If valid, the backend returns a JWT token (8-hour expiry) and user profile data.
6. The token is stored in the browser's local storage.
7. The user is redirected to the Nexus dashboard.
8. A login notification is sent to administrators.

### 2.3 Session Management

| Parameter | Value |
|-----------|-------|
| Token type | JWT (JSON Web Token) |
| Expiry | 8 hours from login |
| Storage | Browser local storage |
| Auto-logout | On 401 Unauthorized response or token expiry |

All API requests include the token in the `Authorization: Bearer <token>` header. If the token expires or becomes invalid, the user is automatically redirected to the login page.

---

## 3. User Journey Overview

The following diagram illustrates the high-level flow of a typical user session in Nexus.

```
LOGIN
  │
  ▼
DASHBOARD ──────────────────────────────────────────────┐
  │                                                      │
  ├── View KPIs & Charts                                 │
  ├── Check Recent Activity                              │
  └── Review Alerts                                      │
  │                                                      │
  ▼                                                      │
TRAVELERS                                                │
  │                                                      │
  ├── Create New Traveler                                │
  │     ├── Select type (PCB / ASSY / CABLE / PURCHASING)│
  │     ├── Enter job information                        │
  │     ├── Define process steps                         │
  │     └── Generate barcode / QR code                   │
  │                                                      │
  ├── Edit / Clone / Archive Travelers                   │
  │                                                      │
  └── Request Approvals (edit / complete / cancel)       │
  │                                                      │
  ▼                                                      │
LABOR TRACKING                                           │
  │                                                      │
  ├── Start / Pause / Stop Timer                         │
  ├── Scan QR Code to Clock In/Out of Steps              │
  └── View Labor History                                 │
  │                                                      │
  ▼                                                      │
REPORTS                                                  │
  │                                                      │
  ├── Labor Hours by Employee                            │
  ├── Work Center Utilization                            │
  └── Export / Print Reports                             │
  │                                                      │
  ▼                                                      │
NOTIFICATIONS ◄──────────────────────────────────────────┘
  │
  ├── Review Alerts & Updates
  └── Mark as Read
  │
  ▼
LOGOUT
```

---

## 4. Step-by-Step User Workflow

This section walks through every major action a user performs in Nexus, in the order they would typically encounter them.

### 4.1 Logging In

1. Open a browser and navigate to the Nexus URL, or click the Nexus tile in ACI Forge.
2. If using direct login, enter your username and password and click **Login**.
3. If using SSO from Forge, authentication happens automatically — you will land on the dashboard within seconds.

### 4.2 The Dashboard

After login, the user lands on the **Dashboard** — the central hub for monitoring operations.

**What you see (Admin view):**

| Section | Description |
|---------|-------------|
| **Metrics Grid** | Cards showing travelers in progress, completed, on hold, and total labor hours. |
| **Status Distribution Chart** | Pie chart showing the breakdown of traveler statuses. |
| **Labor Trends Chart** | Line chart of labor hours over a configurable date range. |
| **Work Center Utilization** | Bar chart showing activity across departments. |
| **Today's Snapshot** | Quick view of today's numbers — new travelers, active entries, completed steps. |
| **Recent Activity Feed** | The last 5 traveler updates across the system. |
| **Alerts Summary** | Any overdue jobs or issues requiring attention. |

**Operator view:** A simplified dashboard focused on assigned work, active labor entries, and personal metrics.

**Date Range Picker:** At the top of the dashboard, a date range picker lets you filter all charts and metrics to a specific time window (e.g., last 7 days, last 30 days, custom range).

### 4.3 Navigating the Platform

The **sidebar** on the left provides access to all sections:

| Menu Item | Description | Access |
|-----------|-------------|--------|
| Dashboard | Main overview | All users |
| Travelers | Create, view, edit travelers | All users |
| Archived Travelers | View archived travelers | All users |
| Labor Tracking | Track labor hours | All users |
| Reports | Generate and view reports | All users |
| Notifications | View alerts and updates | All users |
| Users | Manage user accounts | Admin only |
| Work Centers | Manage work centers | Admin only |
| Profile | View and edit your profile | All users |

The **header bar** provides:
- **Global Search** — Search across travelers, users, work orders, and labor entries. Supports barcode scanning.
- **Notification Bell** — Shows the count of unread notifications. Click to go to the notification center.
- **User Menu** — Access your profile or log out.
- **Theme Toggle** — Switch between light and dark mode.

### 4.4 Creating a New Traveler

A traveler is the core document in Nexus. It represents a manufacturing job and tracks it through all production steps.

1. Navigate to **Travelers** > **Create New** (or click the "+ New Traveler" button on the travelers list page).
2. Fill in the **Job Information** section:
   - **Traveler Type**: Select one of PCB, ASSY (Assembly), CABLE, or PURCHASING.
   - **Job Number**: Enter the job number. If a matching work order exists, related fields auto-populate.
   - **Part Number**, **Customer**, **Description**: Enter or confirm auto-populated values.
   - **Priority**: Select LOW, NORMAL, PREMIUM, HIGH, or URGENT.
   - **Quantity**: Enter the quantity for the job.
3. Define the **Process Steps** (routing):
   - Process steps auto-populate based on the selected traveler type and associated work center templates.
   - Each step includes a work center assignment, sequence number, and description.
   - You can **add manual steps** for custom operations not in the template.
   - Steps support **sub-steps** (e.g., Step 1.1, 1.2) for detailed breakdowns.
   - Steps can be reordered via drag-and-drop.
4. Optionally enable **Labor Hours Table** to include a labor tracking section on the traveler.
5. Review the traveler information in the two-column layout.
6. Click **Save** to create the traveler.

After creation:
- The traveler is assigned a unique ID and status of **CREATED**.
- A **barcode** and **QR code** are generated automatically.
- Step-level QR codes are generated for each process step.
- Administrators receive a notification.

### 4.5 Managing Travelers

**Viewing Travelers:**
- The **Travelers** page displays a filterable, sortable table of all travelers.
- Filters include status, priority, traveler type, date range, and work center.
- Click any traveler row to open its detail view.

**Traveler Detail View:**
- Displays all job information, process steps, labor hours, and scan history.
- Shows the traveler's barcode and QR code for printing or scanning.

**Editing a Traveler:**
- Click **Edit** on a traveler detail page.
- Modify job information, process steps, or sub-steps.
- If the traveler is locked (IN_PROGRESS or beyond), editing requires an **approval request**.

**Cloning a Traveler:**
- Click **Clone** to create a copy of a traveler.
- The revision number auto-increments (e.g., Rev A → Rev B).
- All process steps and configuration are copied to the new traveler.

**Archiving a Traveler:**
- Completed or cancelled travelers can be archived.
- Archived travelers are moved to the **Archived Travelers** view.
- Archived travelers can be restored if needed.

**Traveler Statuses:**

| Status | Description |
|--------|-------------|
| DRAFT | Initial creation, not yet finalized. |
| CREATED | Finalized and ready for production. |
| IN_PROGRESS | Work has begun on at least one step. |
| COMPLETED | All steps are done and approved. |
| ON_HOLD | Temporarily paused. |
| CANCELLED | Permanently stopped (requires approval). |
| ARCHIVED | Moved to long-term storage. |

### 4.6 Barcode and QR Code Scanning

Nexus uses barcodes and QR codes extensively for shop-floor tracking.

**Traveler-Level Codes:**
- **Barcode format**: `NEX-{traveler_id}-{job_number}`
- **QR Code**: Contains traveler ID, job number, part number, system identifier, and company.
- Available on the traveler detail page for printing as a PDF label.

**Step-Level QR Codes:**
- Each process step and manual step has a unique QR code.
- **Format**: `NEXUS-STEP|{traveler_id}|{job_number}|{work_center}|{step_type}|{step_id}|AC`
- Scanning a step QR performs a **SCAN_IN** (start working) or **SCAN_OUT** (stop working) action.
- Duration is automatically calculated between scan-in and scan-out events.

**How to scan:**
1. Navigate to **Travelers** > **Tracking**, or use the barcode scanner in the global search bar.
2. Point the device camera at the QR code or use a connected barcode scanner.
3. The system identifies the traveler/step and records the scan event.
4. Scan history is visible on the traveler detail page.

### 4.7 Tracking Labor Hours

Nexus provides two complementary labor tracking systems.

**System 1 — Labor Entries (Employee-Centric):**
1. Navigate to **Labor Tracking**.
2. Select a traveler (by job number) and a work center.
3. Click **Start** to begin the timer.
4. Click **Pause** to temporarily stop, or **Stop** to complete the entry.
5. Hours are automatically calculated and recorded against your user account.
6. The system uses fuzzy matching to link labor entries to the correct process step based on work center name.

**System 2 — Traveler Time Entries (Job-Centric):**
1. On a traveler detail page, use the time entry section.
2. Add entries by operator name and work center.
3. This system operates independently of process steps and is useful for tracking overall job time.

**Admin-Only Features:**
- Create manual labor entries with past dates (for retroactive corrections).
- Edit or delete existing labor entries.
- View all employees' labor entries (operators can only see their own).

**Auto-Stop Feature:** Active labor entries are automatically stopped at 5:00 PM each day to prevent runaway timers.

### 4.8 Requesting and Managing Approvals

Certain actions require supervisor approval before they take effect.

**When approvals are needed:**
- Editing a traveler that is IN_PROGRESS or beyond.
- Completing a traveler (marking all steps as done).
- Cancelling a traveler.

**Submitting an approval request:**
1. On the traveler detail page, click the action that requires approval (e.g., **Complete** or **Cancel**).
2. A dialog appears asking for a reason/comment.
3. Submit the request. It is routed to designated approvers.
4. Approvers receive an email notification and an in-app notification.

**Approving or rejecting (Approver role):**
1. Navigate to the **Approvals** section (visible in sidebar for approvers).
2. Review the pending request, including the traveler details and the requestor's comment.
3. Click **Approve** or **Reject**.
4. If rejecting, provide a reason.
5. The requestor is notified of the decision.

### 4.9 Viewing Reports

1. Navigate to **Reports** from the sidebar.
2. Select the report type:
   - **Labor Hours by Employee** — Total hours per employee over a date range.
   - **Weekly / Monthly / Daily Breakdown** — Aggregated labor data by time period.
   - **Work Center Utilization** — Activity and efficiency per work center.
3. Set the date range (last 7 days, 30 days, or a custom range).
4. Click **Generate**.
5. View the report in the browser. Reports are formatted for export and printing.

### 4.10 Managing Notifications

1. Click the **notification bell** in the header, or navigate to **Notifications** from the sidebar.
2. View all notifications, filtered by type (traveler, labor, tracking, login) and status (read/unread).
3. Click a notification to view its details.
4. Click **Mark as Read** on individual notifications, or **Mark All as Read** for bulk action.
5. Admins can delete notifications.

**Notification types:**
- Traveler created, updated, or deleted
- Labor entry started, stopped, or modified
- Tracking entry recorded
- User login events (direct and SSO)
- Approval requests and decisions

### 4.11 User Management (Admin Only)

1. Navigate to **Users** from the sidebar.
2. View the list of all users with their roles, status, and approver designation.
3. To create a new user:
   - Click **Create User**.
   - Enter username, full name, and role (Admin or Operator).
   - Set the approver flag if applicable.
   - Set the ITAR access flag if the user needs to view ITAR-restricted travelers.
   - A secure random password is generated.
4. To edit a user, click on their row and modify the desired fields.
5. To deactivate a user, toggle the active status. Deactivated users cannot log in.

### 4.12 Work Center Management (Admin Only)

1. Navigate to **Admin** > **Work Centers** from the sidebar.
2. View all work centers organized by department and category.
3. To create a new work center:
   - Click **Add Work Center**.
   - Enter the name, department, and category.
4. Edit existing work centers by clicking on the row.

Nexus ships with **70+ pre-configured work centers** across four categories:
- **PCB Assembly** — SMT, soldering, testing, inspection, and shipping.
- **PCB Manufacturing** — Board fabrication, layering, and finishing.
- **Cables** — Wire cutting, crimping, pull testing, and assembly.
- **Purchasing** — Engineering, BOM creation, quoting, and inventory.

### 4.13 Profile and Account Settings

1. Click your name in the header, then select **Profile**.
2. View your account information (username, full name, role, approver status).
3. Change your password if needed.

### 4.14 Logging Out

1. Click your name in the header.
2. Select **Logout**.
3. Your JWT token is cleared from local storage and you are redirected to the login page.

---

## 5. Detailed Feature Explanations

### 5.1 Digital Travelers

Travelers are the core data entity in Nexus. Each traveler represents a manufacturing job and contains:

- **Header Information**: Job number, part number, customer, description, priority, quantity, and traveler type.
- **Process Steps (Routing)**: An ordered list of manufacturing operations, each assigned to a work center. Steps auto-populate based on traveler type.
- **Sub-Steps**: Detailed breakdowns within a process step (e.g., Step 3.1: Apply paste, Step 3.2: Place components).
- **Manual Steps**: Custom steps added by the user that are not part of the standard template.
- **Barcode/QR Codes**: Automatically generated for the traveler and each step.
- **Labor Hours Table**: Optional section that tracks labor directly on the traveler document.
- **Revision Tracking**: When a traveler is cloned, the revision letter auto-increments (A → B → C).

**Traveler Types and Their Templates:**

| Type | Description | Typical Work Centers |
|------|-------------|---------------------|
| PCB | Printed Circuit Board Assembly | Kitting, SMT, Wave, AOI, Testing, Inspection, Shipping |
| ASSY | Mechanical Assembly | Component Prep, Hand Assembly, Hardware, Inspection, Shipping |
| CABLE | Cable and Wire Harness | Wire Cut, Strip, Crimp, Solder, Pull Test, Inspection, Shipping |
| PURCHASING | Procurement Workflow | Engineering, BOM, Purchasing, Quote, Inventory |

### 5.2 Dual Labor Tracking System

Nexus supports two complementary labor tracking approaches:

**Labor Entries (Employee-Centric):**
- Tied to a specific employee and process step.
- Uses start/pause/stop timer functionality.
- Fuzzy-matches work center names to process steps automatically.
- Tracks sequence numbers for ordering.
- Best for: Individual employee time cards and step-level tracking.

**Traveler Time Entries (Job-Centric):**
- Tied to a traveler and work center, but independent of process steps.
- Allows manual operator name entry.
- Best for: Overall job-level time tracking and situations where step-level granularity is unnecessary.

### 5.3 Approval Workflow Engine

The approval system enforces governance over critical traveler state changes.

```
┌───────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│ User      │     │ Approval     │     │ Approver      │     │ Action       │
│ requests  │────>│ request      │────>│ reviews &     │────>│ applied or   │
│ action    │     │ created      │     │ decides       │     │ rejected     │
└───────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                        │                      │
                        ▼                      ▼
                  Email + In-App         Notification
                  Notification           to Requestor
```

**Approval Types:**
- **EDIT** — Request to modify a locked traveler.
- **COMPLETE** — Request to mark a traveler as completed.
- **CANCEL** — Request to cancel a traveler.

### 5.4 Barcode and QR Code System

Every traveler and step is assigned unique machine-readable codes for shop-floor scanning.

**Traveler-Level:**
- Barcode: `NEX-{id}-{job_number}` (standard barcode format)
- QR Code: JSON payload with traveler metadata
- PDF labels can be generated for printing

**Step-Level:**
- QR Code: `NEXUS-STEP|{traveler_id}|{job_number}|{work_center}|{step_type}|{step_id}|AC`
- Supports SCAN_IN and SCAN_OUT events
- Automatically calculates duration between scans

**Scanning Methods:**
- Mobile device camera (via html5-qrcode library)
- Connected USB/Bluetooth barcode scanners
- Manual entry in the global search bar

### 5.5 Global Search

The search bar in the header provides cross-entity search:
- **Travelers** — by job number, part number, description, or barcode.
- **Users** — by username or full name.
- **Work Orders** — by order number.
- **Labor Entries** — by job number or employee.

Results are displayed in a dropdown with type indicators. Click a result to navigate directly to that record.

### 5.6 Notification System

Nexus generates automatic notifications for key events:

| Event | Recipients |
|-------|-----------|
| Traveler created | All admins |
| Traveler updated | All admins |
| Traveler deleted | All admins |
| Labor entry started/stopped | All admins |
| Tracking event recorded | All admins |
| User login (direct or SSO) | All admins |
| Approval request created | Designated approvers |
| Approval decision made | Original requestor |

### 5.7 Audit Logging

Every change in Nexus is recorded in a comprehensive audit log:
- **What changed**: Field-level detail with old and new values.
- **Who changed it**: User ID and username.
- **When**: Timestamp of the change.
- **How**: IP address and user agent of the request.

Audit logs are immutable and cannot be edited or deleted.

### 5.8 ITAR Access Control

Travelers with an "M" in the job number are classified as ITAR (International Traffic in Arms Regulations) restricted. Only users with the `is_itar` flag enabled on their account can view these travelers.

### 5.9 Dark Mode

Nexus supports a system-wide dark mode. Toggle it using the theme switch in the header bar. The preference is saved and persists across sessions.

---

## 6. Example End-to-End User Scenario

**Scenario:** Sarah, a production operator at ACI, needs to create a traveler for a new PCB assembly job, track her labor, and move the job through to completion.

### Step 1 — Login via ACI Forge
Sarah opens ACI Forge and logs in with her credentials. On the Forge dashboard, she clicks the **Nexus** tile. She is redirected to the Nexus dashboard within seconds via SSO.

### Step 2 — Review the Dashboard
Sarah checks today's snapshot: 3 travelers in progress, 12 completed this week. She notices an alert about an overdue job and makes a mental note to follow up.

### Step 3 — Create a New Traveler
Sarah navigates to **Travelers** > **Create New**. She selects **PCB** as the traveler type and enters job number `J-2026-0451`. The system auto-populates the part number, customer, and description from the work order. She sets the priority to **NORMAL** and quantity to **50 units**. The process steps auto-populate with the standard PCB routing: Verify BOM → Kitting → SMT Top → SMT Bottom → Wash → AOI → Testing → Inspection → Shipping. She adds a manual step for "Customer-Requested Burn-In Test" between Testing and Inspection. She clicks **Save**.

### Step 4 — Print Barcode Labels
On the traveler detail page, Sarah clicks **Print Label**. A PDF is generated with the traveler barcode and QR code. She prints it and attaches it to the job's physical kit.

### Step 5 — Begin Labor Tracking
Sarah navigates to **Labor Tracking**, selects job `J-2026-0451`, selects work center **KITTING**, and clicks **Start**. The timer begins. She works for 2 hours, then clicks **Stop**. The system records 2.00 hours against the Kitting step.

### Step 6 — QR Code Scanning on the Shop Floor
As the job moves to SMT, the SMT operator scans the step QR code with a tablet camera. This records a **SCAN_IN** event. When SMT work is complete, the operator scans again, recording a **SCAN_OUT** event. The system calculates 3.5 hours of SMT time.

### Step 7 — Track Progress Through Steps
Over the next several days, each work center scans in and out as they complete their step. The traveler status automatically moves to **IN_PROGRESS** after the first scan.

### Step 8 — Request Completion Approval
Once all steps are done, Sarah navigates to the traveler and clicks **Complete**. Since this requires approval, she enters a comment: "All 50 units passed inspection. Ready for shipping." The request is sent to the approvers.

### Step 9 — Approval
Adam, a designated approver, receives an email notification and an in-app notification. He opens the approval request, reviews the traveler details and Sarah's comment, and clicks **Approve**. The traveler status changes to **COMPLETED**.

### Step 10 — Generate Report
At the end of the week, the production manager navigates to **Reports**, selects **Labor Hours by Employee** for the last 7 days, and generates the report. Sarah's 2 hours of kitting time and all other labor entries for job `J-2026-0451` appear in the summary.

### Step 11 — Archive
After shipping is confirmed, an admin archives the traveler. It moves to the **Archived Travelers** view for long-term record-keeping.

---

## 7. Error Handling and Common Issues

### 7.1 Login Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Invalid credentials" | Incorrect username or password | Verify credentials. Use the password reset option or contact an admin. |
| Account locked/inactive | Admin has deactivated the account | Contact your administrator to reactivate. |
| Blank screen after login | Token storage issue | Clear browser local storage and try again. |
| Session expired mid-work | 8-hour token expiry reached | Log in again. In-progress work on unsaved forms will be lost. |

### 7.2 SSO Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| "SSO token expired" | More than 60 seconds between Forge redirect and Nexus callback | Return to Forge and click the Nexus tile again. |
| "Access denied" | User does not have Nexus tool assigned in Forge | Contact the Forge administrator to grant Nexus access. |
| User not found in Nexus | User sync from Forge failed | Admin should manually create the user in Nexus, or re-trigger sync from Forge. |
| SSO works but direct login fails | Separate credential systems | SSO and direct login use different credential stores. Ensure your Nexus direct login credentials are set up. |

### 7.3 Traveler Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Cannot edit traveler | Traveler is locked (IN_PROGRESS or beyond) | Submit an EDIT approval request. |
| Process steps not auto-populating | No template for the selected traveler type | Manually add process steps, or contact admin to configure templates. |
| Barcode not scanning | Damaged print or camera issue | Reprint the label. Ensure adequate lighting. Try manual search entry. |
| "Job number already exists" | Duplicate job number | Use a different job number, or locate and clone the existing traveler. |

### 7.4 Labor Tracking Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Timer still running | Forgot to stop the timer | Stop it manually. Entries auto-stop at 5 PM. Admin can edit the end time. |
| Cannot create manual entry | Operator role restriction | Only admins can create manual (backdated) entries. Contact your admin. |
| Hours seem incorrect | Pause/resume calculation error | Admin can edit the labor entry to correct the hours. |
| Cannot delete entry | Operator role restriction | Only admins can delete labor entries. |

### 7.5 Approval Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| No response to approval request | Approver has not seen the notification | Contact the approver directly. Check that email notifications are configured. |
| Approval request rejected | Approver determined the action is not appropriate | Review the rejection reason and take corrective action before resubmitting. |

---

## 8. Best Practices for Users

### 8.1 Recommended Usage Patterns

- **Create travelers before starting work.** This ensures all labor tracking and scanning data is captured from the beginning.
- **Use QR scanning for step tracking.** Scanning is faster and more accurate than manual timer entry.
- **Stop your timer before leaving.** If you forget, the auto-stop at 5 PM will capture your entry, but the hours may be inflated.
- **Clone instead of recreating.** When a repeat job comes in, clone the previous traveler to save time and ensure consistency.
- **Check the dashboard daily.** The dashboard provides a quick summary of all active work and any alerts that need attention.

### 8.2 Security Considerations

- **Do not share your login credentials.** Each user should have their own account for accurate audit trails.
- **Log out when leaving a shared workstation.** Sessions last 8 hours — leaving a session open on a shared device is a security risk.
- **ITAR travelers are restricted.** Only access ITAR-flagged jobs if you have the appropriate clearance and the `is_itar` flag on your account.
- **Report suspicious activity.** If you notice unfamiliar login notifications or unauthorized changes, contact your administrator immediately.

### 8.3 Efficient Workflow Tips

- **Use global search.** Instead of browsing through pages of travelers, search by job number or barcode to find records instantly.
- **Set priority levels accurately.** Priority flags help the team focus on urgent work first.
- **Use sub-steps for complex operations.** Breaking a process step into sub-steps provides better granularity for labor tracking and progress monitoring.
- **Review notifications regularly.** Notifications alert you to approval requests, status changes, and system events that may require your attention.
- **Use dark mode for shop-floor tablets.** Dark mode reduces glare in bright manufacturing environments.

---

## 9. Appendix

### 9.1 Glossary of Key Terms

| Term | Definition |
|------|-----------|
| **Traveler** | A digital document representing a manufacturing job, containing job information, process steps, and tracking data. Replaces the traditional paper "shop traveler." |
| **Process Step** | A single manufacturing operation within a traveler's routing (e.g., SMT, Inspection, Shipping). Each step is assigned to a work center. |
| **Sub-Step** | A detailed breakdown within a process step (e.g., Step 3.1, 3.2). Used for granular tracking. |
| **Manual Step** | A user-added custom step not in the standard template. |
| **Work Center** | A defined manufacturing location or operation type (e.g., SMT TOP, WAVE, AOI). Over 70 pre-configured. |
| **Labor Entry** | A time record for an employee working on a specific step. Employee-centric tracking. |
| **Time Entry** | A time record for a traveler at a work center. Job-centric tracking. |
| **Approval** | A formal request for a supervisor to authorize a traveler action (edit, complete, cancel). |
| **Barcode** | A machine-readable code printed on traveler labels. Format: `NEX-{id}-{job}`. |
| **QR Code** | A two-dimensional code containing traveler or step metadata, scannable by camera. |
| **SSO** | Single Sign-On. Allows users to access Nexus through ACI Forge without separate login. |
| **JWT** | JSON Web Token. The session token format used for authentication (8-hour expiry). |
| **ITAR** | International Traffic in Arms Regulations. Restricts access to certain defense-related travelers. |
| **ACI Forge** | The central ACI platform that provides SSO access to Nexus and other ACI applications. |
| **Audit Log** | An immutable record of all changes made in the system, including who, what, and when. |

### 9.2 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER DEVICES                             │
│          (Desktop Browsers, Tablets, Barcode Scanners)          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NGINX REVERSE PROXY                         │
│                       (Port 100)                                │
│                                                                 │
│   ┌─────────────────────┐     ┌───────────────────────────┐    │
│   │   Next.js Frontend  │     │   FastAPI Backend          │    │
│   │   (Port 103)        │     │   (Port 102)               │    │
│   │                     │     │                             │    │
│   │ • Dashboard         │     │ • REST API Endpoints        │    │
│   │ • Traveler Forms    │────>│ • JWT Authentication        │    │
│   │ • Labor Tracking    │     │ • Business Logic            │    │
│   │ • Reports & Charts  │     │ • Barcode/QR Generation     │    │
│   │ • QR Scanner        │     │ • Email Notifications       │    │
│   │ • Notifications     │     │ • Audit Logging             │    │
│   └─────────────────────┘     └──────────────┬──────────────┘    │
│                                               │                  │
└───────────────────────────────────────────────┼──────────────────┘
                                                │
                            ┌───────────────────▼──────────────────┐
                            │        PostgreSQL Database           │
                            │            (Port 101)                │
                            │                                      │
                            │ • Users, Roles, Permissions          │
                            │ • Travelers, Steps, Sub-Steps        │
                            │ • Labor Entries, Time Entries         │
                            │ • Approvals, Audit Logs              │
                            │ • Notifications, Work Centers        │
                            │ • Barcode Scan Events                │
                            └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL INTEGRATIONS                       │
│                                                                 │
│   ┌─────────────────────┐     ┌───────────────────────────┐    │
│   │   ACI Forge (SSO)   │     │   SMTP Email Server       │    │
│   │                     │     │                             │    │
│   │ • Token Generation  │     │ • Approval Notifications    │    │
│   │ • User Sync         │     │ • Login Alerts              │    │
│   │ • Access Control    │     │                             │    │
│   └─────────────────────┘     └───────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.0 |
| Database | PostgreSQL 15+ |
| Authentication | JWT (8-hour expiry), bcrypt password hashing, SSO via ACI Forge |
| Barcode/QR | Custom generation service, html5-qrcode scanner library |
| Charts | Recharts |
| Infrastructure | Docker, Docker Compose, Nginx |
| Email | SMTP integration for approval notifications |

### 9.4 Port Configuration

| Port | Service |
|------|---------|
| 100 | Nginx Reverse Proxy (main entry point) |
| 101 | PostgreSQL Database |
| 102 | FastAPI Backend API |
| 103 | Next.js Frontend |

---

*This document is maintained by the ACI development team. For questions, corrections, or update requests, contact the system administrator.*
