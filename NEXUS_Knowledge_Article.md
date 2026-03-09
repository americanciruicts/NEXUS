# NEXUS - Knowledge Article

## What is NEXUS?

NEXUS is a **Manufacturing Traveler Management System** built for American Circuits, Inc. It replaces traditional paper-based travelers with a fully digital system. A "traveler" is a document that follows a job through every stage of manufacturing - from the moment engineering receives the order to the moment shipping sends it out the door.

NEXUS gives management full visibility into where every job is on the production floor, how long each step takes, who completed it, and what the overall progress looks like - all in real time.

---

## Who Uses NEXUS?

NEXUS has two types of users:

| Role | Who | What They Do |
|------|-----|-------------|
| **Admin** | Supervisors, managers, engineering leads | Create travelers, manage work centers, view reports, approve travelers, manage users |
| **Operator** | Floor workers, technicians, assemblers | View assigned travelers, complete steps, log labor hours, scan barcodes |

---

## Admin User Guide

### Logging In

1. Open NEXUS in your browser (local: http://localhost:100 or Vercel: https://aci-nexus.vercel.app)
2. Enter your email address and password
3. Click **Login**
4. Alternatively, log in through **ACI Forge** and click the NEXUS link - this uses Single Sign-On (SSO) so you don't need to enter credentials again

### The Dashboard

After logging in, you land on the **Dashboard**. This is your command center:

- **Metrics Grid** - Shows total travelers, in-progress count, completed count, and overdue count at a glance
- **Status Distribution Chart** - Pie/bar chart showing how many travelers are in each status (Draft, Created, In Progress, Completed, On Hold)
- **Traveler Tracking Hours Chart** - Visual breakdown of labor hours across work centers
- **Recent Activity Feed** - Live feed of the latest actions (travelers created, steps completed, logins)
- **Alerts Summary** - Any urgent items that need attention (overdue travelers, pending approvals)

### Creating a New Traveler

This is the core task for admins. Here's how to do it step by step:

1. Click **Travelers** in the sidebar, then click the **+ New Traveler** button
2. Fill in the **Header Information**:
   - **Job Number** - The job identifier (e.g., "J-24-0501")
   - **Work Order Number** - Auto-generated, but can be overridden
   - **PO Number** - Customer's purchase order number
   - **Traveler Type** - Select one:
     - **PCB Assembly** - For assembled circuit boards (most common, 53 work centers available)
     - **PCB** - For bare printed circuit boards (27 work centers)
     - **Cables** - For cable and wire harness assemblies (19 work centers)
     - **Purchasing** - For purchase-only orders (5 work centers)
   - **Part Number** - The part being manufactured
   - **Part Description** - Description of the part
   - **Revision** - Drawing/design revision level
   - **Quantity** - How many units to produce
   - **Customer Code / Customer Name** - Who ordered it
   - **Priority** - Low, Normal, High, or Urgent
   - **Start Date / Due Date / Ship Date** - Key schedule dates
   - **Notes / Specs** - Any additional information or specifications

3. **Add Process Steps** - This is where you define the manufacturing sequence:
   - Click **+ Add Step** to add a new step
   - For each step, fill in:
     - **SEQ #** - The sequence number (order of operations). You can type a number or drag-and-drop steps to reorder them
     - **Work Center** - Select from the dropdown (e.g., ENGINEERING, SMT TOP, WAVE, AOI, LABELING, FINAL INSPECTION, SHIPPING)
     - **Instructions** - Detailed instructions for the operator (e.g., "Inspect solder joints under 10x magnification, check for bridges and cold joints")
     - **Quantity** - Quantity for this step (usually same as traveler quantity)
     - **Estimated Time** - How long this step should take (in minutes)
   - Steps appear in a table format on desktop or card format on mobile
   - Use the drag handle (three horizontal lines icon) to reorder steps by dragging
   - Click **Remove** to delete a step you don't need

4. Click **Save** or **Create Traveler** to save the traveler

### Editing an Existing Traveler

1. Go to **Travelers** page
2. Find the traveler you want to edit (use search bar or scroll)
3. Click on the traveler to open it
4. Click the **Edit** button
5. Make your changes to any field or process step
6. Click **Save Changes**

### Cloning a Traveler

When you have a repeat order or similar job:

1. Open the traveler you want to copy
2. Click **Clone** button
3. NEXUS creates a new traveler with all the same steps and information
4. The revision number auto-increments
5. Modify any fields that are different for the new job
6. Save the new traveler

### Managing Work Centers (Admin Only)

Work centers are the building blocks of every traveler. To manage them:

1. Go to **Admin** > **Work Centers** in the sidebar
2. You'll see tabs for each traveler type: **PCB Assembly**, **PCB**, **Cable**, **Purchasing**
3. Click a tab to see all work centers for that type
4. **To add a new work center:**
   - Click **+ Add Work Center**
   - Enter the name (e.g., "CONFORMAL COATING")
   - Add a description (e.g., "Apply conformal coating to assembled PCB per IPC-A-610 standards")
   - Select a category (e.g., "HAND hrs. Actual")
   - Click **Save**
5. **To edit a work center:** Click the edit icon next to it, modify the fields, and save
6. **To delete a work center:** Click the delete icon and confirm
7. **To reorder work centers:** Use the up/down arrow buttons to change the default order they appear in when creating travelers

### Viewing Progress

1. Go to **Travelers** page
2. Each traveler shows a **progress bar** with:
   - Color-coded fill (Red 0-25%, Orange 25-50%, Amber 50-75%, Blue 75-100%, Green 100%)
   - Percentage complete (e.g., "85%")
   - Step count (e.g., "17/20 steps")
3. Click on any traveler to see detailed step-by-step progress
4. In the detail view, completed steps show a green checkmark with the name of who completed it and when

### Approvals

Some travelers may require approval before production begins:

1. The creator submits the traveler for approval
2. Approvers receive a notification
3. Go to the traveler and review all details
4. Click **Approve** to approve or **Reject** to send it back with comments
5. Approval history is tracked and visible on the traveler

### Reports

1. Go to **Reports** in the sidebar
2. View reports on:
   - Traveler status summaries
   - Labor hours by work center
   - Completion rates and timelines
   - Operator productivity

### Archiving Travelers

Once a job is fully complete and shipped:

1. Open the completed traveler
2. Click **Archive**
3. The traveler moves to the **Archived** section
4. To view archived travelers, go to **Travelers** > **Archived**
5. Archived travelers can be restored if needed

### Managing Notifications

1. Click the bell icon in the top navigation bar
2. View all notifications:
   - Login events (who logged in, when, from what IP)
   - Traveler updates (new travelers created, steps completed)
   - Approval requests
3. Notifications show the user's full name and email address for easy identification

---

## Operator User Guide

### Logging In

1. Open NEXUS in your browser
2. Enter your email and password, or use SSO from ACI Forge
3. You'll land on the **Dashboard** with your assigned work

### Your Dashboard

As an operator, your dashboard shows:
- **Your assigned travelers** - Jobs that have steps in your work center
- **Recent activity** - What's been happening on the floor
- **Your labor hours summary** - How many hours you've logged today/this week

### Viewing Your Travelers

1. Click **Travelers** in the sidebar
2. You'll see all active travelers
3. Use the **search bar** to find a specific job by job number, work order, or part number
4. The **progress bar** on each traveler shows how far along it is
5. Click on a traveler to see all its steps

### Completing a Step

This is your main task. When you finish a manufacturing operation:

**Method 1: Through the Traveler Detail Page**
1. Click on the traveler to open it
2. Find your step in the list (steps are in sequence order)
3. Look for your work center name (e.g., "SMT TOP", "WAVE", "AOI")
4. Fill in:
   - **Accepted** - How many units passed
   - **Rejected** - How many units failed (if any)
   - **Sign** - Your initials or name
5. Click the **Complete** checkbox or button to mark the step as done
6. The step turns green and shows your name and completion time

**Method 2: Using QR Code Scanning**
1. Click the **Scan** button in the navigation bar
2. Point your camera at the QR code printed on the traveler step
3. NEXUS automatically opens that step
4. Fill in the accepted/rejected quantities and your signature
5. Mark as complete

**Method 3: Using Barcode Scanning**
1. Click **Scan** in the navigation
2. Scan the barcode on the traveler
3. NEXUS opens the traveler detail page
4. Navigate to your step and complete it

### Tracking Labor Hours

If labor tracking is enabled for a traveler:

1. Open the traveler and find your step
2. Click **Start Timer** when you begin working
3. If you need to take a break, click **Pause**
4. Click **Resume** when you're back
5. Click **Stop** when you finish the operation
6. The system automatically calculates your hours worked
7. You can add a description of what you did (optional)

Alternatively, go to **Labor Tracking** in the sidebar to:
- See all your labor entries
- Manually add labor hours if you forgot to start the timer
- View your total hours by day or week

### Viewing a Traveler's Steps (Read-Only)

When you open a traveler, you can see:
- All process steps in order, with their sequence numbers
- Which steps are completed (green checkmark) and which are pending
- Who completed each step and when
- Instructions for each step - read these carefully before starting work
- The overall progress bar at the top
- Accepted/rejected quantities for each step

### On Desktop vs Mobile

**Desktop View (Computer):**
- Steps display in a **table format** with columns: SEQ #, Work Center, Instructions, Qty, Accepted, Rejected, Sign, Date, Status
- You can see many steps at once
- Drag and drop to reorder steps (if you have edit permission)

**Mobile View (Phone/Tablet):**
- Steps display as **cards** stacked vertically
- Each card shows the step number, work center, and status
- Tap a card to expand it and see full details
- QR scanning works great on mobile - just point your phone camera

### What You Cannot Do (Operator Restrictions)

As an operator, you **cannot**:
- Create or delete travelers (admins only)
- Manage work centers (admins only)
- Edit traveler header information (job number, customer, etc.)
- Delete process steps
- Access the Admin section
- Approve or reject travelers

You **can**:
- View all travelers
- Complete steps assigned to your work center
- Log labor hours
- Scan barcodes and QR codes
- View the dashboard and your work summary
- View notifications

---

## Common Workflows

### Workflow 1: New Customer Order (Admin)

1. Receive customer PO
2. Log into NEXUS
3. Click **+ New Traveler**
4. Enter job details from the PO (part number, quantity, customer info, due date)
5. Select traveler type (e.g., PCB Assembly)
6. Add process steps in manufacturing order:
   - ENGINEERING (review drawings, generate CAD)
   - VERIFY BOM (check bill of materials)
   - ORDER/PURCHASE PCB (if bare boards needed)
   - SMT TOP (surface mount, top side)
   - SMT BOTTOM (surface mount, bottom side)
   - WAVE (wave soldering for through-hole components)
   - AOI (automated optical inspection)
   - HAND SOLDER (manual rework if needed)
   - WASH (board cleaning)
   - FINAL INSPECTION
   - LABELING
   - PACKAGING
   - SHIPPING
7. Add specific instructions for each step
8. Set priority based on due date urgency
9. Save the traveler
10. The traveler is now visible to all operators on the floor

### Workflow 2: Daily Floor Operations (Operator)

1. Start your shift, log into NEXUS
2. Check the dashboard for your assigned work
3. Pick up the next job traveler
4. Scan the traveler barcode or QR code on your step
5. Read the instructions carefully
6. Start the labor timer
7. Perform the operation
8. Record accepted and rejected quantities
9. Sign off on the step
10. Mark it as complete
11. Stop the labor timer
12. Move the physical product to the next work center
13. The progress bar automatically updates

### Workflow 3: Repeat Order (Admin)

1. Find the original traveler for this part number
2. Click **Clone**
3. Update the new job number, PO number, quantity, and dates
4. Review steps - add or remove any that changed
5. Save the new traveler
6. Much faster than creating from scratch

### Workflow 4: Checking Job Status (Admin/Operator)

1. Go to **Travelers** page
2. Search for the job number
3. See the progress bar immediately - no need to walk the floor
4. Click the traveler for detail:
   - Which steps are done
   - Who completed each step
   - When each step was completed
   - How many units were accepted/rejected at each stage
5. Use this information to give customers accurate delivery updates

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't log in | Check your email and password. Try logging in through ACI Forge (SSO). Contact admin if locked out. |
| Traveler not showing up | Make sure you're not filtering by status. Check if it's in the Archived section. Use the search bar. |
| Can't complete a step | Make sure you're logged in as an operator. Check if the traveler is in "On Hold" or "Cancelled" status. |
| Progress bar not updating | Refresh the page. Make sure the step was actually marked as complete (green checkmark visible). |
| QR code won't scan | Make sure your camera has permission. Try better lighting. Hold the phone steady. Try the barcode instead. |
| Labor timer didn't save | Check your internet connection. Go to Labor Tracking page and manually add the hours. |
| Can't access Admin pages | Only admin users can access Admin. Contact your supervisor to upgrade your account. |

---

## Glossary

| Term | Definition |
|------|-----------|
| **Traveler** | A digital work order that follows a job through manufacturing. Contains all steps, instructions, and tracking data. |
| **Work Center** | A specific manufacturing operation or station (e.g., SMT, WAVE, AOI, SHIPPING). |
| **Process Step** | One operation within a traveler, assigned to a work center with specific instructions. |
| **SEQ #** | Sequence number - the order in which steps should be performed. |
| **Work Order** | A unique identifier for the manufacturing run, auto-generated by NEXUS. |
| **Job Number** | The company's internal job identifier. |
| **PO Number** | The customer's purchase order number. |
| **PCB** | Printed Circuit Board - a bare board without components. |
| **PCB Assembly** | A printed circuit board with components soldered onto it. |
| **SMT** | Surface Mount Technology - automated placement of small components. |
| **AOI** | Automated Optical Inspection - machine vision inspection of solder joints. |
| **Wave Soldering** | A process for soldering through-hole components using a wave of molten solder. |
| **BOM** | Bill of Materials - list of all components needed for assembly. |
| **SSO** | Single Sign-On - log in once through ACI Forge, access NEXUS without re-entering credentials. |
| **Labor Tracking** | Recording how many hours each operator spends on each step. |
| **Clone** | Create a copy of an existing traveler with all its steps and settings. |
| **Archive** | Move a completed traveler to long-term storage. Can be restored later. |

---

## Access URLs

| Environment | URL | Use Case |
|------------|-----|----------|
| Local (Office Network) | http://localhost:100 | When connected to the office network |
| Vercel (Remote) | https://aci-nexus.vercel.app | When working remotely or on mobile |
| ACI Forge (SSO Login) | https://aci-forge.vercel.app | Central login portal for all ACI applications |

---

*Document created: March 6, 2026*
*Last updated: March 6, 2026*
*Application: NEXUS v1.0*
*Organization: American Circuits, Inc.*
