# NEXUS Training Guide - Operator

**Version:** 1.0  
**Date:** April 2025  
**Audience:** Operator Users  
**Confidential - Internal Use Only**

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Navigation Overview](#2-navigation-overview)
3. [Dashboard](#3-dashboard)
4. [Travelers](#4-travelers)
5. [Viewing a Traveler](#5-viewing-a-traveler)
6. [Labor Tracking](#6-labor-tracking)
7. [Scanning and Barcodes](#7-scanning-and-barcodes)
8. [Profile Page](#8-profile-page)
9. [General Features](#9-general-features)

---

## 1. Logging In

- Open your browser and go to the NEXUS web address provided by your supervisor.
- You will be redirected to the ACI FORGE login page.
- Enter your **username** and **password**, then click **Sign In**.
- Once logged in, you will land on your **Dashboard**.
- Your session lasts **14 hours**. You will see a warning at **15 minutes** remaining and again at **5 minutes** remaining. After that, you will be logged out automatically and need to sign in again.

---

## 2. Navigation Overview

As an Operator, you have access to the following tabs in the top navigation bar:

| Tab | What It Does |
|-----|-------------|
| **Dashboard** | Your personal production overview |
| **Travelers** | View traveler cards (read-only) |
| **Labor** | Track your work time and view your entries |

**Note:** The following tabs are **not available** to Operator accounts: Jobs, Reports, Analytics, User Management, and Work Center Management. If you need access to any of these, contact your Admin.

On the **right side** of the navigation bar you will find:

- **Global Search** - Search for travelers by job number, part number, or customer
- **Theme Toggle** (sun/moon icon) - Switch between light and dark mode
- **Your Profile Menu** - Access your Profile page and Sign Out

---

## 3. Dashboard

Your Dashboard shows a simplified view focused on your personal work.

### Your Current Assignments
- A list of the jobs and work centers you are currently assigned to.
- Shows which traveler and step you are working on.

### Quick Timer
- A convenient timer right on the dashboard to start or stop labor tracking without navigating to the full Labor Tracking page.

### Your Progress
- Your individual production progress for the day.
- Hours worked and steps completed.

### Live Production Metrics (Top Cards)
- **Jobs In Progress** - Number of active jobs across the shop
- **Travelers In Progress** - Number of active travelers
- **Active Labor Entries** - How many people are currently clocked in
- **On-Time Delivery Rate** - Percentage of jobs on schedule
- **Quality Metrics** - Quantities accepted vs. rejected

### Department Progress Breakdown
- Color-coded progress bars for each production department.
- Gives you a quick view of how the shop floor is doing overall.

---

## 4. Travelers

The Travelers tab shows a paginated list of all traveler cards. As an Operator, you can **view** travelers but you **cannot** create, edit, or delete them.

### What You See
Each row displays:
- Job Number, Work Order, Part Number, Description
- Traveler Revision and Customer Revision
- Quantity
- Customer Name
- **Status** badge: Created, In Progress, Completed, On Hold, or Cancelled
- **Traveler Type** badge with color coding:
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
- **Date Range Filter** - Narrow results by date.

### Actions Available to You
- **View** (eye icon) - Open the traveler detail page in read-only mode.

### Traveler Groups
- Some travelers are linked in groups (e.g., "Group 1 of 3"). A badge shows the group position.
- Click the badge to see all related travelers.

---

## 5. Viewing a Traveler

When you click View on a traveler, you see the full detail page in **read-only mode**.

### Header Information
- Job Number (with a scannable barcode), Work Order, PO Number
- Part Number, Description, Revisions (Traveler and Customer)
- Quantity Ordered, Customer Code and Name
- Traveler Type, Status, Priority
- Due Date and Ship Date
- Lead-Free and ITAR indicators

### Process Steps Table (Routing)
This is the core of the traveler. Each row represents one manufacturing step:
- Step Number, Work Center, Operation/Instruction
- Quantity, Qty Accepted, Qty Rejected
- Sign-off field, Completed Date, Status
- **QR Code** next to each step (these are the codes you scan for labor tracking)

### Department Progress
- Visual breakdown showing how far along each department is.

### Labor Hours Summary
- Total hours worked on this traveler.
- Breakdown by category: SMT, Hand Soldering, Through-Hole, AOI/QC, E-Test, Labelling/Packaging.

### Specifications
- Any special notes or requirements added by the Admin.

### Printing
- Click the **Print** button to generate a print-ready version of the traveler.
- The printout includes the header barcode and all step QR codes.
- RMA travelers print in landscape; all others print in portrait.

---

## 6. Labor Tracking

The Labor Tracking page is where you log your work time. This is one of the most important tools you will use daily.

### Starting a Timer

1. **Enter the Job Number**
   - Type the job number in the Job Number field, OR
   - Scan the barcode on the traveler header using your scanner.
   - The system will auto-fill and show available work centers.

2. **Enter the Work Center**
   - Select from the dropdown list that appears after entering the job number, OR
   - Scan the QR code next to the step on your printed traveler.
   - The system will auto-fill the work center and link to the correct step.

3. **Your Name**
   - Your name is automatically filled in. You cannot change this.

4. **Click Start**
   - The timer begins counting in HH:MM:SS format.
   - You will see the elapsed time updating on screen.

### Pausing the Timer

- Click the **Pause** button if you need to temporarily stop (e.g., break, waiting for parts).
- A dialog box will appear asking for a reason. Type a brief explanation and click **OK**.
- Click **Resume** when you are ready to continue working.
- All pause times and reasons are recorded.

### Stopping the Timer

You have two ways to stop the timer:

**Option A - Click Stop**
1. Click the **Stop** button.
2. A dialog will appear asking how many units you completed.
3. Enter the quantity and an optional comment.
4. Click **Submit** to save the entry.

**Option B - Scan to Stop (Recommended)**
1. While the timer is running, scan the **same step QR code** that you started with.
2. The timer stops immediately.
3. The quantity dialog appears.
4. Enter your quantity and click **Submit**.
5. This is the fastest way to stop a timer - you do not even need to touch the screen.

### Viewing Your Entries

Below the timer area, you will see a table of your labor entries showing:
- Job Number, Work Center
- Start Time, End Time, Hours Worked
- Quantity Completed, Status, Comments

You can **view** your entries but you **cannot** edit or delete them. If you made a mistake, ask your Admin to correct it.

### Filters
- Filter your entries by Job Number, Work Center, or Date Range.
- Filter by Status (Active or Completed).

### Job Summary Panel
- A collapsible sidebar showing jobs you have logged time against.
- Click a job to filter your entries for that job only.

---

## 7. Scanning and Barcodes

NEXUS uses barcodes and QR codes to make your work faster and more accurate. Your shop floor scanner works directly with NEXUS without any special setup.

### Types of Codes You Will Encounter

**Job Number Barcode (on the traveler header)**
- A standard horizontal barcode at the top of each printed traveler.
- Contains the job number.
- Scan it to quickly fill in the Job Number field on the Labor Tracking page.

**Step QR Codes (next to each step in the routing table)**
- Each manufacturing step has its own square QR code.
- It contains the job number, work center, step number, and operation name.
- Scan it to fill in both the Job Number and Work Center at the same time.

### How to Use Your Scanner

Your barcode scanner plugs into the computer and works like a keyboard. There is nothing special to install.

### Workflow 1: Starting a New Timer with Scanning

1. Go to the **Labor Tracking** page.
2. Click into the **Job Number** field.
3. **Scan the header barcode** on your traveler.
4. The job number fills in and work centers load.
5. Click into the **Work Center** field.
6. **Scan the step QR code** for the step you are about to work on.
7. The work center fills in automatically.
8. Click **Start**.

**Even Faster Method:**
1. Go to the **Labor Tracking** page.
2. Click into the **Work Center** field.
3. **Scan the step QR code** directly.
4. Both the Job Number AND Work Center fill in automatically.
5. Click **Start**.

### Workflow 2: Stopping a Timer with Scanning

1. While your timer is running, you do **not** need to click into any field.
2. Simply **scan the same step QR code** that you started with.
3. The system recognizes it matches your running timer and **stops it instantly**.
4. The quantity dialog appears - enter your count and submit.

**This means your full workflow can be:**
- Scan to start → Do your work → Scan to stop

### Important Notes About Scanning

- If you scan a step that is already marked as completed, you will see a **warning message**. Let your Admin know if this happens unexpectedly.
- The scanner works anywhere on the Labor Tracking page when a timer is running. You do not need to have your cursor in a specific field to stop a timer by scanning.
- If the scan does not register, make sure the QR code on your printed traveler is clean and undamaged. Ask your Admin for a reprint if needed.

### Printing Travelers
- You can print any traveler you are viewing by clicking the **Print** button on the traveler detail page.
- The printout includes all barcodes and QR codes needed for scanning.

---

## 8. Profile Page

Access from the profile dropdown menu in the top right by selecting **Profile**.

### What You See
- Your **Username** and **Email**.
- Your **Role** (Operator).
- Approver badge (if applicable).
- A permissions summary showing what features are available to you:
  - View Travelers
  - Track Labor Time
  - View your own labor entries

---

## 9. General Features

### Global Search
- Available from the navigation bar at all times.
- Search for travelers by job number, part number, or customer name.
- Results appear as you type.
- Click any result to navigate directly to it.

### Dark Mode / Light Mode
- Toggle using the **sun/moon icon** in the navigation bar.
- Your preference is remembered by your browser.
- When printing, the system always uses light mode for readability.

### Offline Mode
- If you lose internet connection, NEXUS continues to work with cached data.
- An offline indicator will appear on screen.
- Your data will sync automatically once your connection is restored.

### Session Warnings
- At **15 minutes** before your session expires: a yellow warning appears.
- At **5 minutes** before expiry: a red urgent message appears.
- When the session expires: you are taken back to the login page. Sign in again to continue.

### Mobile Use
- NEXUS works on mobile devices and tablets.
- On smaller screens, the navigation collapses into a hamburger menu (three horizontal lines) in the top left.
- Tap it to see all your available tabs.
- Traveler routing tables display as cards on mobile for easier reading.

### Tips for Daily Use

1. **Always scan when possible** - It is faster and more accurate than typing.
2. **Check your timer** - Make sure it is running when you start a step and stopped when you finish.
3. **Log pause reasons** - This helps your supervisors understand delays and improve processes.
4. **Enter accurate quantities** - Your count is used for quality tracking and job progress.
5. **Report issues** - If a step QR code does not scan, a traveler seems wrong, or you cannot log time, tell your Admin right away.

---

## Quick Reference Card

| I Want To... | How To Do It |
|-------------|-------------|
| Start tracking time | Labor tab → Enter Job + Work Center → Click Start |
| Start tracking time (fast) | Labor tab → Scan step QR code → Click Start |
| Pause my timer | Click Pause → Enter reason → Click OK |
| Resume my timer | Click Resume |
| Stop my timer | Click Stop → Enter quantity → Submit |
| Stop my timer (fast) | Scan the same step QR code |
| Find a traveler | Search bar → Type job number or part number |
| View a traveler | Travelers tab → Click the eye icon |
| Print a traveler | Open traveler → Click Print |
| Switch to dark mode | Click the sun/moon icon in the top right |
| Sign out | Profile menu (top right) → Sign Out |

---

**End of Operator Training Guide**
