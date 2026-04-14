# NEXUS Training Guide - Administrator

**Version:** 1.0  
**Date:** April 2025  
**Audience:** Admin Users  
**Confidential - Internal Use Only**

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Navigation Overview](#2-navigation-overview)
3. [Dashboard](#3-dashboard)
4. [Travelers](#4-travelers)
5. [Creating a New Traveler](#5-creating-a-new-traveler)
6. [Traveler Detail Page](#6-traveler-detail-page)
7. [Jobs](#7-jobs)
8. [Job Detail Page](#8-job-detail-page)
9. [Labor Tracking](#9-labor-tracking)
10. [Scanning and Barcodes](#10-scanning-and-barcodes)
11. [Reports](#11-reports)
12. [Analytics](#12-analytics)
13. [Notifications](#13-notifications)
14. [User Management](#14-user-management)
15. [Work Center Management](#15-work-center-management)
16. [Profile Page](#16-profile-page)
17. [General Features](#17-general-features)

---

## 1. Logging In

- Open your browser and go to the NEXUS web address provided by your IT department.
- You will be redirected to the ACI FORGE login page.
- Enter your username and password, then click **Sign In**.
- Once authenticated, you will land on the **Dashboard**.
- Your session lasts **14 hours**. You will see a warning at **15 minutes** remaining and again at **5 minutes** remaining. After that, you will be logged out automatically and need to sign in again.

---

## 2. Navigation Overview

As an Admin, you have access to all tabs in the top navigation bar:

| Tab | What It Does |
|-----|-------------|
| **Dashboard** | Live production overview and metrics |
| **Travelers** | Manage all traveler cards (view, create, edit, delete) |
| **Jobs** | View and manage manufacturing jobs |
| **Labor** | Track labor time, manage entries for all operators |
| **Reports** | Generate labor and production reports |
| **Analytics** | View advanced charts, trends, and forecasts |

On the **right side** of the navigation bar you will find:

- **Global Search** - Search across travelers, jobs, and users
- **Theme Toggle** (sun/moon icon) - Switch between light and dark mode
- **Notification Bell** - View recent alerts (with unread count badge)
- **Your Profile Menu** - Access Profile, Notifications, User Management, Work Center Management, and Sign Out

---

## 3. Dashboard

The Dashboard is your real-time command center. It shows:

### Live Production Metrics (Top Cards)
- **Jobs In Progress** - Number of active jobs
- **Travelers In Progress** - Number of active travelers
- **Active Labor Entries** - How many operators are currently clocked in
- **On-Time Delivery Rate** - Percentage of jobs being delivered on schedule
- **Quality Metrics** - Quantities accepted vs. rejected

### Date Range Picker
- Use this to filter all dashboard data by a custom date range.

### Department Progress Breakdown
- Color-coded progress bars for each production department (SMT, Soldering, Through-Hole, Quality, Shipping, etc.).
- Shows the percentage of completion for each department in real time.

### Overdue Jobs / Travelers
- A list of jobs and travelers that are past their due date.
- Highlighted with risk indicators so you can take immediate action.
- Click any item to jump directly to its detail page.

### Stuck Travelers
- Identifies travelers that have been sitting in a single work center for too long.
- Shows how long the traveler has been at that step.
- Click to navigate directly to the traveler.

### Live Work Center Updates
- Shows which operators are working at which work centers right now.
- Displays the job and work order being executed.
- Shows time elapsed at the current step.
- Updates automatically every 2 minutes.

---

## 4. Travelers

The Travelers tab shows a paginated table of all traveler cards in the system.

### What You See
Each row displays:
- Job Number, Work Order, Part Number, Description
- Traveler Revision and Customer Revision
- Quantity
- Customer Name
- Status badge (Created, In Progress, Completed, On Hold, Cancelled)
- Traveler Type badge with color coding:
  - **PCB Assembly** - Standard PCB assembly
  - **PCB** - Raw PCB fabrication
  - **Cable** - Cable/harness assembly
  - **Purchasing** - Purchased components
  - **RMA Same** - Return/repair (same job revision)
  - **RMA Different** - Return/repair (different job revision)
  - **Modification** - Engineering modification
- Current Step / Work Center
- Progress bar showing completion percentage
- Created Date

### Searching and Filtering
- **Search bar** at the top to find travelers by job number, part number, or customer name.
- **Status Filter** - Show only travelers with a specific status.
- **Type Filter** - Show only a specific traveler type.
- **Date Range Filter** - Narrow results by creation date.

### Actions Available to You
- **View** (eye icon) - Open the full traveler detail page.
- **Edit** (pencil icon) - Open the traveler for editing.
- **Clone** (copy icon) - Duplicate the traveler with a new job number.
- **Print** (printer icon) - Generate a print-ready version.
- **Delete** (trash icon) - Delete the traveler (a confirmation prompt will appear).
- **Bulk Actions** - Select multiple travelers using checkboxes to apply actions to all at once.
- **Inline Updates** - Click on a status or priority to change it directly from the list.

### Traveler Groups
- Some travelers are linked in groups (e.g., "Group 1 of 3"). A badge will show the group position.
- Click the group badge to see all related travelers in the group.

---

## 5. Creating a New Traveler

You can create a new traveler from the Travelers dropdown menu by selecting **New Traveler**.

### Step-by-Step

1. **Select Traveler Type** - Choose from PCB Assembly, PCB, Cable, Purchasing, RMA Same, RMA Different, or Modification. The form will adjust based on the type you pick.

2. **Enter Job Information**
   - **Job Number** - Type or scan the job number. The system will look it up automatically and fill in Part Number, Description, Customer Code, Customer Name, and Build Quantity.
   - **Work Order Number** - Enter manually or use the prefix-suffix builder.
   - **PO Number** - Enter the purchase order number.

3. **Set Quantities and Details**
   - **Order Quantity** - How many units.
   - **Traveler Revision** - Automatically incremented or enter manually.
   - **Lead-Free** checkbox - Check if this is a lead-free build.
   - **ITAR** flag - Check if this job has ITAR restrictions (job numbers containing "M" are automatically flagged).

4. **Set Dates**
   - **Due Date** - When the job is due.
   - **Ship Date** - When it needs to ship.

5. **Configure Process Steps**
   - The system auto-populates work centers based on the traveler type you selected.
   - You can add steps manually, remove steps, or reorder them.
   - Each step includes: Work Center, Operation/Instruction, and Quantity.

6. **RMA-Specific Fields** (only for RMA and Modification types)
   - Customer Contact, Original WO/PO, Return PO, Invoice Number, Customer NCR
   - RMA Units Table: Unit Number, Serial Number, Customer Complaint, Inspection Notes, Disposition, Troubleshooting Notes, Repair Notes, Final Inspection Notes

7. **Click Save** to create the traveler. The system will generate barcodes and QR codes automatically.

---

## 6. Traveler Detail Page

When you open a traveler, you see a comprehensive detail page.

### Header Information
- Job Number (with a scannable barcode), Work Order, PO Number
- Part Number, Description, Revisions (Traveler and Customer)
- Quantity Ordered, Customer Code and Name
- Status and Priority dropdowns (you can change these)
- Due Date and Ship Date
- Lead-Free and ITAR indicators

### Process Steps Table (Routing)
This is the core of the traveler. Each row represents one manufacturing step:
- Step Number, Work Center, Operation/Instruction
- Quantity, Qty Accepted, Qty Rejected
- Sign-off field (operator initials), Completed Date, Status
- **QR Code** next to each step (used for scanning on the shop floor)

**As Admin, you can:**
- Add new steps at any position
- Edit step details
- Delete steps
- Drag and drop to reorder steps

### Department Progress
- Visual breakdown by department showing how far along each department is.

### Labor Hours Summary
- Total hours worked on this traveler
- Breakdown by category: SMT hours, Hand Soldering hours, Through-Hole hours, AOI/QC hours, E-Test hours, Labelling/Packaging hours

### Specifications Section
- Add dated specifications or notes.
- Edit or delete existing specifications.

### Material/Stock Information
- From Stock, To Stock, Ship Via, and Comments fields.

### Action Buttons
- **Edit** - Toggle edit mode to modify any field
- **Save** - Save your changes
- **Clone** - Duplicate the traveler
- **Print** - Print the full traveler with barcodes and QR codes
- **Change Status** - Move to On Hold, Cancelled, etc.
- **Request Approval** - Send for sign-off if needed

---

## 7. Jobs

The Jobs tab gives you a view of all manufacturing jobs.

### Job List
Each job shows:
- Job Number, Description, Customer Name and Code
- Customer Part Number, Build Quantity, Order Quantity
- Job Revision, Customer Revision, Work Order
- **Status** - New, In Prep, In Manufacturing
- **Health Indicator**:
  - **Needs Traveler** - No travelers created yet
  - **Blocked** - Something is preventing progress
  - **At Risk** - Approaching or past due date
  - **On Track** - Everything is progressing normally
  - **Complete** - All travelers finished
- Traveler Count (completed / total)
- Progress bar
- Total Labor Hours
- Created By and Created Date

### Searching and Filtering
- Search by job number, customer name, or description.
- Filter by Status or Health indicator.

### Actions
- Click any job to open its detail page.
- **Auto-Create Traveler** button - The system will automatically create a traveler using data pulled from the KOSH inventory system.
- Data updates automatically every 2 minutes.

---

## 8. Job Detail Page

### Job Header
- All job details at a glance with key metrics.

### Bill of Materials (BOM)
- Full component list with:
  - ACI Part Number, Description, Manufacturer Part Number
  - Quantity Per Board, Required Total
  - On Hand quantity, Manufacturing Floor quantity
  - **Shortage Amount** (highlighted in red if critical)
  - Inventory Location

### Associated Travelers
- List of all travelers linked to this job.
- Quick links to each traveler detail page.
- Shows type, status, and progress for each traveler.

### Job Progress
- Overall completion percentage.
- Manufacturing vs. order quantity comparison.

---

## 9. Labor Tracking

The Labor Tracking page is where all time tracking happens.

### Starting a Timer
1. Enter or scan the **Job Number**.
2. Enter or scan the **Work Center** (the system will show available work centers for that job).
3. Your name is auto-filled as the operator.
4. Click **Start** to begin the timer.
5. The elapsed time displays in HH:MM:SS format.

### Pausing the Timer
- Click **Pause** to temporarily stop the clock.
- A dialog will appear asking for a reason (e.g., "Waiting for parts", "Break").
- Click **Resume** to continue.
- All pause durations and reasons are logged.

### Stopping the Timer
- Click **Stop** or scan the same step QR code to auto-stop.
- A dialog will appear asking for the quantity completed.
- Add an optional comment.
- Click **Submit** to save the entry.

### Manual Entry (Admin Only)
- Click the **Add Manual Entry** button.
- Fill in: Job Number, Work Center, Operator Name (you can select any operator), Date, Time In, Time Out, Hours Worked (auto-calculated), Quantity Completed, and Comments.
- Click **Submit** to save.

### Labor Entry List
A paginated table showing all entries:
- Job Number, Work Center, Operator Name
- Start Time, End Time, Hours Worked
- Quantity Completed, Status, Comments

**Admin Actions:**
- **Edit** (pencil icon) - Modify any field on an existing entry
- **Delete** (trash icon) - Remove an entry
- **Drag to Reorder** - Rearrange the order of entries
- **Add Pause Logs** - Add pause reasons to existing entries
- **Bulk Delete** - Select and delete multiple entries at once

### Filters
- Filter by Job Number, Work Center, Operator Name
- Filter by Date Range and Time Range
- Filter by Status (Active / Completed)

### Job Summary Panel
- Collapsible sidebar showing all jobs with logged labor.
- Total hours per job.
- Click a job to filter entries for that job only.

---

## 10. Scanning and Barcodes

NEXUS uses a barcode and QR code system for fast, accurate shop floor tracking.

### Types of Codes

**Job Number Barcode (Header)**
- A standard barcode printed on each traveler header.
- Contains the job number.
- Scan it to quickly fill in the Job Number field on the Labor Tracking page.

**Step QR Codes**
- Each process step on a traveler has its own unique QR code.
- The QR code contains: traveler ID, job number, work order, work center, step number, operation name, and step ID.
- These are displayed next to each step in the routing table and included when you print the traveler.

### How to Use a Scanner

NEXUS supports any **hardware barcode/QR scanner** that acts as a keyboard (most commercial scanners work this way). You do not need to install any special software.

**Scanning a Job Number:**
1. Go to the Labor Tracking page.
2. Click into the **Job Number** field.
3. Scan the barcode on the traveler header.
4. The job number auto-fills and the system loads available work centers.

**Scanning a Step QR Code:**
1. On the Labor Tracking page, click into the **Work Center** field.
2. Scan the QR code next to the step on the printed traveler.
3. The system automatically fills in the Job Number (if empty), Work Center, and links to the specific step.
4. If the step is already completed, you will see a warning.

**Auto-Stop Timer by Scanning:**
1. While a timer is running, the system listens for scanner input at all times (you do not need to click into any field).
2. Scan the QR code of the **same step** that is currently being timed.
3. The timer stops immediately and the quantity dialog appears.
4. This allows operators to stop timers hands-free just by scanning.

### Printing Travelers with Barcodes
1. Open any traveler detail page.
2. Click the **Print** button.
3. The print view includes the header barcode and all step QR codes, formatted for clear printing.
4. RMA travelers print in landscape format; all others print in portrait.

---

## 11. Reports

The Reports tab lets you generate detailed labor and production reports.

### Available Report Types

| Report | What It Shows |
|--------|--------------|
| **Single Traveler** | All labor hours for one specific traveler |
| **All Travelers** | Labor hours across all travelers |
| **Single Operator** | All hours logged by one specific operator |
| **All Operators** | Hours breakdown by every operator |
| **Single Work Center** | Hours logged at one work center (optionally filtered by job) |
| **All Work Centers** | Hours breakdown across all work centers |
| **Single Category** | Hours for one category (SMT, Hand, Through-Hole, AOI/QC, E-Test, Labelling/Packaging) |
| **All Categories** | Complete breakdown across all categories |

### Running a Report
1. Select the report type.
2. Enter the required input (e.g., operator name, job number).
3. Set the **Date Range** to narrow the results.
4. Click **Generate**.

### Report View Page
- Data table with sortable columns.
- Summary statistics at the top (total hours, entry count).
- **Export to CSV** button to download the data.
- **Print** button for a hard copy.

---

## 12. Analytics

The Analytics tab provides advanced visual insights. It has four sub-tabs:

### Insights Tab
- Key performance indicators at a glance.
- Production health score.
- Quality metrics and on-time delivery percentage.
- Labor efficiency metrics.
- Bottleneck identification (which steps are slowing things down).

### Trends Tab
- **Labor Trends Chart** - Historical hours worked over time.
- **Department Trends** - Production output by department over time.
- **Work Center Utilization Chart** - Hours logged at each work center.
- **Work Center Status Card** - Live view of active tasks at each work center.

### Forecast Tab
- Predictive completion timelines.
- Capacity forecasts.
- Resource planning insights.
- Trend projections to help with scheduling.

### Production Analytics Tab
- Comprehensive production metrics.
- Quality trends over time.
- Efficiency calculations.
- Performance comparisons across departments.

### Common Features
- All tabs have a **Date Range Picker** (defaults to last 30 days).
- Charts and data update when you change the date range.
- Color-coded visualizations for easy reading.

---

## 13. Notifications

### Notification Bell (Top Right)
- Shows a badge with the number of unread notifications.
- Click to see the 10 most recent notifications.
- Each notification shows: title, message, type, time, and who triggered it.
- Click **Mark All Read** to clear the unread count.
- Click **View All Notifications** to go to the full page.

### Full Notifications Page
- Complete history of all notifications, paginated.
- **Notification Types:** User Login, Traveler Created/Updated/Deleted, Labor Entry Created/Updated/Deleted, Tracking Entry Created/Updated/Deleted.
- **Filters:** By type, by read status (All, Read, Unread), or search by title/message.
- **Actions:** Mark individual or all as read, delete individual notifications, or bulk select and delete.

### Real-Time Alerts
- Toast notifications appear on screen when new events happen.
- The system checks for new notifications every 2 minutes.

---

## 14. User Management

Access from the profile dropdown menu by selecting **User Management**.

### User List
- Paginated table showing: Username, Email, Role, Approver badge, Active/Inactive status, Created date.

### Adding a New User
1. Click the **Add User** button (plus icon).
2. Fill in: Username, Email, First Name, Last Name, Password.
3. Select **Role**: Admin or Operator.
4. Check **Approver** if this user should be able to approve traveler requests.
5. Check **ITAR Access** if this user needs access to ITAR-restricted travelers.
6. Click **Save**.

### Editing a User
- Click the **Edit** button (pencil icon) next to any user.
- Change role, toggle approver or ITAR flags, update email or name.
- Click **Save**.

### Deleting a User
- Click the **Delete** button (trash icon).
- Confirm in the dialog that appears.
- Note: The system will not allow you to delete the last Admin account.

### Filters
- Search by username or email.
- Filter by Role (Admin, Operator, All).
- Filter by Status (Active, Inactive).

---

## 15. Work Center Management

Access from the profile dropdown menu by selecting **Work Center Management**.

### Layout
The page is organized by **tabs**, one for each traveler type:
- PCB Assembly, PCB, Cables, Purchasing, RMA Same Job, RMA Different Job, Modification RMA

### Within Each Tab
A list of work centers showing:
- Work Center Name, Code, Department (color-coded badge), Category, Sort Order, Status (Active/Inactive)

### Adding a Work Center
1. Click the **Add** button (plus icon).
2. Enter: Name, Code, Description.
3. Select the Department.
4. Select the Category (used for labor hour categorization).
5. Set the Sort Order (determines the order in routing tables).
6. Toggle Active/Inactive status.
7. Click **Save**.

### Editing or Deleting
- **Edit** (pencil icon) - Modify any field.
- **Delete** (trash icon) - Remove with confirmation.

### Sync with Templates
- If you accidentally delete a default work center, use the **Sync** option to restore it from the standard template.

---

## 16. Profile Page

Access from the profile dropdown menu by selecting **Profile**.

### What You See
- Your Username, Email, and Role (Admin).
- Approver badge (if applicable).
- A permissions summary showing all features available to you:
  - View Travelers, Create Travelers, Edit Travelers
  - View Reports, View Analytics
  - Approve Travelers (if you are an approver)
  - Track Labor Time
  - Manage Users, Manage Work Centers

---

## 17. General Features

### Global Search
- Available from the navigation bar at all times.
- Search across travelers, jobs, and users.
- Results appear in real time as you type.
- Click any result to navigate directly to it.

### Dark Mode / Light Mode
- Toggle using the sun/moon icon in the navigation bar.
- Your preference is saved in your browser.
- Print always uses light mode for readability.

### Offline Mode
- NEXUS works offline with cached data if you lose internet connection.
- An offline indicator will appear on screen.
- Data syncs automatically when your connection is restored.

### Session Warnings
- At **15 minutes** before session expiry: a warning message appears.
- At **5 minutes** before session expiry: an urgent message appears.
- When the session expires: you are redirected to the login page.

### Keyboard Shortcuts
- Hardware barcode scanners work as keyboard input throughout the application.
- No special setup required - just plug in the scanner and use it.

---

**End of Admin Training Guide**
