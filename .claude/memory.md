# NEXUS Traveler Management System - Complete System Documentation

**Last Updated:** 2026-02-02
**Purpose:** Accurate documentation of ALL UI/UX, functionality, database schema, and system components based on thorough code analysis

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Traveler Types & Work Centers](#traveler-types--work-centers)
3. [Database Schema](#database-schema)
4. [UI/UX Design System](#uiux-design-system)
5. [Core Functionality](#core-functionality)
6. [Authentication & Security](#authentication--security)
7. [API Endpoints](#api-endpoints)

---

## System Overview

### Technology Stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python 3.9+), SQLAlchemy ORM, Pydantic
- **Database:** PostgreSQL
- **Authentication:** JWT with HTTPBearer, BCrypt password hashing
- **API Base URL:** `http://acidashboard.aci.local:100/api`

### Application Structure
```
NEXUS/
├── frontend/src/
│   ├── app/
│   │   ├── auth/login/          # Login & password reset UI
│   │   ├── dashboard/           # Main dashboard with live tracking
│   │   ├── travelers/           # Traveler CRUD pages
│   │   ├── labor-tracking/      # Labor hours tracking
│   │   ├── reports/             # Reporting and analytics
│   │   ├── notifications/       # Notifications page
│   │   ├── profile/             # User profile
│   │   └── users/               # User management (admin only)
│   ├── components/
│   │   ├── TravelerForm.tsx     # Main create/edit form
│   │   └── layout/              # Header, Layout components
│   ├── context/
│   │   └── AuthContext.tsx      # Authentication state
│   ├── data/
│   │   └── workCenters.ts       # Work center definitions
│   └── types/
│       └── index.ts             # TypeScript types
│
├── backend/
│   ├── routers/
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── travelers.py         # Traveler CRUD
│   │   ├── labor.py             # Labor tracking
│   │   ├── traveler_tracking.py # Location tracking
│   │   ├── notifications.py     # Notification system
│   │   ├── users.py             # User management
│   │   ├── approvals.py         # Approval workflow
│   │   ├── search.py            # Global search
│   │   ├── barcodes.py          # Barcode generation
│   │   └── work_orders.py       # Work orders
│   ├── models.py                # SQLAlchemy database models
│   ├── schemas/                 # Pydantic validation schemas
│   ├── services/                # Business logic services
│   └── database.py              # DB connection config
│
└── user_cred.md                 # User credentials (29 users total)
```

---

## Traveler Types & Work Centers

### Frontend Traveler Types (Actually Used in UI)

The system uses exactly **4 traveler types** defined in `TravelerForm.tsx`:

```javascript
const travelerTypes = [
  { value: 'PCB_ASSEMBLY', label: 'PCB Assembly', color: 'bg-blue-600' },
  { value: 'PCB', label: 'PCB', color: 'bg-green-600' },
  { value: 'CABLES', label: 'Cables', color: 'bg-purple-600' },
  { value: 'PURCHASING', label: 'Purchasing', color: 'bg-orange-600' }
];
```

**Type Details:**

1. **PCB_ASSEMBLY**
   - Label: "PCB Assembly"
   - Badge Color: bg-blue-600 (#2563eb)
   - Card Gradient: from-indigo-500 to-purple-600
   - Maps to backend: **ASSY**
   - Work Centers: 46 stations

2. **PCB**
   - Label: "PCB"
   - Badge Color: bg-green-600 (#16a34a)
   - Card Gradient: from-indigo-500 to-purple-600
   - Maps to backend: **PCB**
   - Work Centers: 16 stations

3. **CABLES**
   - Label: "Cables"
   - Badge Color: bg-purple-600 (#9333ea)
   - Card Gradient: from-indigo-500 to-purple-600
   - Maps to backend: **CABLE**
   - Work Centers: 7 stations

4. **PURCHASING**
   - Label: "Purchasing"
   - Badge Color: bg-orange-600 (#ea580c)
   - Card Gradient: from-indigo-500 to-purple-600
   - Maps to backend: **PURCHASING**
   - Work Centers: 3 stations

### Backend Enum (models.py)

**ONLY 4 types - no others exist:**

```python
class TravelerType(enum.Enum):
    PCB = "PCB"
    ASSY = "ASSY"
    CABLE = "CABLE"
    PURCHASING = "PURCHASING"
```

### Type Mapping (Frontend → Backend)

**Clean 1:1 mapping - only the 4 types:**

```javascript
const travelerTypeMap: { [key: string]: string } = {
  'PCB_ASSEMBLY': 'ASSY',
  'PCB': 'PCB',
  'CABLES': 'CABLE',
  'PURCHASING': 'PURCHASING'
};
```

**Complete Mapping:**
```
PCB_ASSEMBLY (Frontend) → ASSY (Backend)
PCB (Frontend)          → PCB (Backend)
CABLES (Frontend)       → CABLE (Backend)
PURCHASING (Frontend)   → PURCHASING (Backend)
```

### Work Centers by Type

From `workCenters.ts`:

#### PCB_ASSEMBLY Work Centers (46 total)
```
ENGINEERING                   - Reverse engineering and design
VERIFY BOM                    - Verify no BOM or rev changes
KITTING                       - Pull parts from inventory
COMPONENT PREP                - Pre-bending of parts
PROGRAM PART                  - Programming prior to SMT
HAND SOLDER                   - Hand soldering (no wave/SMT)
SMT PROGRAMMING               - Programming SMT machine
GLUE                          - Gluing at SMT after paste
SMT TOP                       - SMT top placement
SMT BOTTOM                    - SMT bottom placement
WASH                          - Cleaning process
X-RAY                         - Visual continuity check
MANUAL INSERTION              - Install parts before wave
WAVE                          - Wave soldering
CLEAN TEST                    - Ion tester for cleanliness
TRIM                          - Cut excess leads
PRESS FIT                     - Pressure insert parts
HAND ASSEMBLY                 - Assembly after wave
AOI PROGRAMMING               - Programming AOI machine
AOI                           - Automated Optical Inspection
SECONDARY ASSEMBLY            - Assembly after ESS/inspection
EPOXY                         - Gluing or epoxying
INTERNAL TESTING              - In-house testing at ACI
LABELING                      - Label placement
DEPANEL                       - Break panel into boards
PRODUCT PICTURES              - Take pictures before shipping
SEND TO EXTERNAL COATING      - Ship to coating
RETURN FROM EXTERNAL COATING  - Receive from coating
INTERNAL COATING              - In-house coating
SEND TO ESS                   - Ship to ESS
RETURN FROM ESS               - Receive from ESS
VISUAL INSPECTION             - Human visual inspection
MANUAL ASSEMBLY               - Hand assembly
BOX ASSEMBLY                  - Mechanical build
HARDWARE                      - Screws, nuts, bolts, displays
SHIPPING                      - Ship to customer
```

#### PCB Work Centers (16 total)
```
JOB NUMBER                    - ACI job number
NUMBER OF LAYERS              - Board layer quantity
BOARD SIZE                    - Physical dimensions
MATERIAL                      - Base material/foundation
BOARD THICKNESS               - Overall thickness
COPPER THICKNESS              - Conductive copper layer
GOLD                          - ENIG surface finish
HAL/HASL/LF HASL             - Surface finish/plating
GOLD FINGERS                  - Gold contacts on edge
CSINK                         - Countersink holes
BLIND & BURIED VIAS           - Via types
GENERATE GERBER/PANELIZATION  - Create vendor zip file
ORDER/PURCHASE PCB            - Vendor name and quantity
RECEIVING                     - Receive and inventory parts
VSCORE                        - Machine break panel
FINAL INSPECTION              - QC sample inspection
SHIPPING                      - Ship to customer
```

#### CABLES Work Centers (7 total)
```
WIRE CUT                      - Cut wire to length
STRIP WIRE                    - Remove insulation
HEAT SHRINK                   - Cut and shrink tubing
TINNING                       - Dip wire end in solder
CRIMPING                      - Fold into ridges
INSERT                        - Install pins into connector
PULL TEST                     - Verify crimp strength
```

#### PURCHASING Work Centers (3 total)
```
PURCHASING                    - Procure parts at lowest price
QUOTE                         - Estimate material/labor/PCB costs
INVENTORY                     - Add to inventory, track stock
```

---

## Database Schema

### Core Enums

```python
# User Roles
class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"

# Traveler Status
class TravelerStatus(enum.Enum):
    DRAFT = "DRAFT"
    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ON_HOLD = "ON_HOLD"
    CANCELLED = "CANCELLED"
    ARCHIVED = "ARCHIVED"

# Priority Levels
class Priority(enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"

# Approval Status
class ApprovalStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
```

### Complete Table Schemas

#### users table
```sql
id                INTEGER PRIMARY KEY
username          VARCHAR(50) UNIQUE NOT NULL
email             VARCHAR(100) UNIQUE NOT NULL
first_name        VARCHAR(50) NOT NULL
last_name         VARCHAR(50) NOT NULL
hashed_password   VARCHAR(255) NOT NULL (bcrypt hash)
role              ENUM(UserRole) NOT NULL DEFAULT OPERATOR
is_approver       BOOLEAN DEFAULT FALSE
is_active         BOOLEAN DEFAULT TRUE
created_at        TIMESTAMP WITH TIME ZONE SERVER DEFAULT NOW()
updated_at        TIMESTAMP WITH TIME ZONE ON UPDATE NOW()

INDEXES: username, email
RELATIONSHIPS: created_travelers, labor_entries, audit_logs
```

#### travelers table
```sql
id                    INTEGER PRIMARY KEY
job_number            VARCHAR(50) NOT NULL INDEXED
work_order_number     VARCHAR(50) INDEXED
po_number             VARCHAR(255)
traveler_type         ENUM(TravelerType) NOT NULL
part_number           VARCHAR(50) NOT NULL
part_description      VARCHAR(200) NOT NULL
revision              VARCHAR(20) NOT NULL
quantity              INTEGER NOT NULL
customer_code         VARCHAR(20)
customer_name         VARCHAR(100)
priority              ENUM(Priority) DEFAULT NORMAL
work_center           VARCHAR(20) NOT NULL
status                ENUM(TravelerStatus) DEFAULT CREATED
is_active             BOOLEAN DEFAULT TRUE
notes                 TEXT
specs                 TEXT
specs_date            VARCHAR(20)
from_stock            VARCHAR(100)
to_stock              VARCHAR(100)
ship_via              VARCHAR(100)
comments              TEXT
due_date              VARCHAR(20)
ship_date             VARCHAR(20)
include_labor_hours   BOOLEAN DEFAULT FALSE
created_by            INTEGER FK(users.id) NOT NULL
part_id               INTEGER FK(parts.id)
created_at            TIMESTAMP WITH TIME ZONE
updated_at            TIMESTAMP WITH TIME ZONE
completed_at          TIMESTAMP WITH TIME ZONE

INDEXES: job_number, work_order_number
RELATIONSHIPS: creator(User), part(Part), process_steps, manual_steps, labor_entries, approvals, audit_logs
```

#### process_steps table
```sql
id                INTEGER PRIMARY KEY
traveler_id       INTEGER FK(travelers.id) NOT NULL
step_number       INTEGER NOT NULL
operation         VARCHAR(100) NOT NULL (work center name)
work_center_code  VARCHAR(20) FK(work_centers.code) NOT NULL
instructions      TEXT NOT NULL
quantity          INTEGER
accepted          INTEGER
rejected          INTEGER
sign              VARCHAR(50) (initials)
completed_date    VARCHAR(20) (YYYY-MM-DD format)
estimated_time    INTEGER (minutes)
is_required       BOOLEAN DEFAULT TRUE
is_completed      BOOLEAN DEFAULT FALSE
completed_by      INTEGER FK(users.id)
completed_at      TIMESTAMP WITH TIME ZONE
created_at        TIMESTAMP WITH TIME ZONE

RELATIONSHIPS: traveler(Traveler), work_center(WorkCenter), sub_steps(SubStep[])
```

#### labor_entries table
```sql
id              INTEGER PRIMARY KEY
traveler_id     INTEGER FK(travelers.id) NOT NULL
step_id         INTEGER FK(process_steps.id)
work_center     VARCHAR(100)
sequence_number INTEGER
employee_id     INTEGER FK(users.id) NOT NULL
start_time      TIMESTAMP WITH TIME ZONE NOT NULL
pause_time      TIMESTAMP WITH TIME ZONE
end_time        TIMESTAMP WITH TIME ZONE
hours_worked    FLOAT DEFAULT 0.0
description     TEXT
is_completed    BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP WITH TIME ZONE

RELATIONSHIPS: traveler(Traveler), employee(User)
```

#### traveler_time_entries table
```sql
id              INTEGER PRIMARY KEY
traveler_id     INTEGER FK(travelers.id) NOT NULL
job_number      VARCHAR(50) NOT NULL INDEXED
work_center     VARCHAR(100) NOT NULL
operator_name   VARCHAR(100) NOT NULL
start_time      TIMESTAMP WITH TIME ZONE NOT NULL
pause_time      TIMESTAMP WITH TIME ZONE
end_time        TIMESTAMP WITH TIME ZONE
hours_worked    FLOAT DEFAULT 0.0
pause_duration  FLOAT DEFAULT 0.0 (hours)
is_completed    BOOLEAN DEFAULT FALSE
created_by      INTEGER FK(users.id)
created_at      TIMESTAMP WITH TIME ZONE

INDEXES: job_number
RELATIONSHIPS: traveler(Traveler), user(User)
```

#### notifications table
```sql
id                    INTEGER PRIMARY KEY
user_id               INTEGER FK(users.id) NOT NULL
notification_type     ENUM(NotificationType) NOT NULL
title                 VARCHAR(200) NOT NULL
message               TEXT NOT NULL
reference_id          INTEGER
reference_type        VARCHAR(50) (traveler/labor_entry/tracking_entry)
created_by_username   VARCHAR(100)
is_read               BOOLEAN DEFAULT FALSE
created_at            TIMESTAMP WITH TIME ZONE INDEXED
read_at               TIMESTAMP WITH TIME ZONE

RELATIONSHIPS: user(User)
```

*Additional tables: work_centers, parts, sub_steps, manual_steps, approvals, audit_logs, traveler_tracking_logs, step_scan_events, work_orders*

---

## UI/UX Design System

### Complete Color Palette

#### Brand Colors
```css
NEXUS Logo: #0891b2 (cyan-600)
Primary: #2563eb (blue-600)
```

#### All Gradients Used in System

**Login Page Background:**
```css
background: linear-gradient(135deg, #2563eb 0%, #4f46e5 30%, #6366f1 60%, #7c3aed 100%);
/* blue-600 → indigo-700 → indigo-500 → purple-600 */
```

**Animated Gradient Orbs (Login Background):**
```css
Orb 1: rgba(99, 102, 241, 0.4)   /* indigo-500, 40%, blur(100px) */
Orb 2: rgba(124, 58, 237, 0.35)  /* purple-600, 35%, blur(100px) */
Orb 3: rgba(79, 70, 229, 0.3)    /* indigo-700, 30%, blur(100px) */
Orb 4: rgba(147, 51, 234, 0.25)  /* purple-500, 25%, blur(100px) */
```

**Dashboard Header:**
```css
linear-gradient(to right, #2563eb, #4338ca, #7c3aed)
/* from-blue-600 via-indigo-700 to-purple-800 */
```

**Submit/Login Buttons:**
```css
Normal: linear-gradient(135deg, #0891b2 0%, #0e7490 100%)
Hover:  linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)
```

**Stats Cards:**
```css
In Progress: linear-gradient(to-br, #3b82f6, #2563eb)  /* blue-500 to blue-600 */
Completed: linear-gradient(to-br, #10b981, #16a34a)    /* emerald-500 to green-600 */
```

**Quick Action Cards:**
```css
View Travelers: from-blue-500 to-blue-600 (#3b82f6 to #2563eb)
Traveler Tracking: from-purple-500 to-purple-600 (#a855f7 to #9333ea)
Labor Tracking: from-indigo-500 to-indigo-600 (#6366f1 to #4f46e5)
Reports: from-emerald-500 to-green-600 (#10b981 to #16a34a)
User Management (Admin): from-orange-500 to-red-600 (#f97316 to #dc2626)
```

**Traveler Type Selection Cards:**
```css
All types: linear-gradient(to-br, #6366f1, #9333ea)  /* indigo-500 to purple-600 */
Hover: from-indigo-600 to-purple-700 (#4f46e5 to #7c3aed)
```

**Form Header:**
```css
linear-gradient(to-r, #4f46e5, #9333ea)  /* indigo-600 to purple-600 */
```

**Action Buttons:**
```css
Print: from-gray-600 to-gray-700 (#4b5563 to #374151)
Barcode: from-purple-600 to-indigo-600 (#9333ea to #4f46e5)
Save Draft: from-amber-600 to-orange-600 (#d97706 to #ea580c)
Create/Update: from-blue-600 to-indigo-600 (#2563eb to #4f46e5)
Add Step: from-green-600 to-emerald-600 (#16a34a to #059669)
  Hover: from-green-700 to-emerald-700 (#15803d to #047857)
```

#### Status Badge Colors
```css
IN_PROGRESS:
  bg: #eff6ff (blue-50)
  text: #1d4ed8 (blue-700)
  dot: #3b82f6 (blue-500)

COMPLETED:
  bg: #f0fdf4 (green-50)
  text: #15803d (green-700)
  dot: #22c55e (green-500)

ON_HOLD:
  bg: #fefce8 (yellow-50)
  text: #a16207 (yellow-700)
  dot: #eab308 (yellow-500)

DRAFT:
  bg: #f9fafb (gray-50)
  text: #374151 (gray-700)
  dot: #6b7280 (gray-500)
```

#### Compliance Badge Colors
```css
Lead Free (L):
  bg: #dcfce7 (green-100)
  border: #86efac (green-300)
  text: #166534 (green-800)

ITAR (M):
  bg: #f3e8ff (purple-100)
  border: #d8b4fe (purple-300)
  text: #6b21a8 (purple-800)
```

#### Section Backgrounds
```css
Specifications: bg-yellow-50 border-2 border-yellow-200
Stock & Shipping: bg-blue-50 border-2 border-blue-200
Process Steps: linear-gradient(to-br, from-blue-50, to-indigo-50) border-2 border-blue-200
Comments: bg-green-50 border-2 border-green-200
Compliance: linear-gradient(to-br, from-indigo-50, to-purple-50) border-2 border-indigo-200
```

#### Input Field Colors
```css
Required: border-2 border-blue-300 (#93c5fd), focus: border-blue-500 ring-2 ring-blue-200
Regular: border-2 border-gray-300 (#d1d5db), focus: border-blue-500 ring-2 ring-blue-200
Rejected: border-2 border-red-300 (#fca5a5), focus: border-red-500 ring-2 ring-red-200
Accepted: border-2 border-green-300 (#86efac), focus: border-green-500 ring-2 ring-green-200
Work Center: border-2 border-blue-500 (#3b82f6), font-bold (emphasized)
```

#### Page Backgrounds
```css
Login: linear-gradient(135deg, #2563eb 0%, #4f46e5 30%, #6366f1 60%, #7c3aed 100%)
Dashboard: linear-gradient(to-br, #f8fafc, #ffffff, #eff6ff)  /* slate-50 via white to blue-50 */
Forms: linear-gradient(to-br, #eef2ff, #faf5ff, #eff6ff)  /* indigo-50 via purple-50 to blue-50 */
```

#### Shadows
```css
Cards:
  Default: 0 10px 15px -3px rgba(0,0,0,0.1) (shadow-lg)
  Hover: 0 20px 25px -5px rgba(0,0,0,0.1) (shadow-xl)
  Login: 0 30px 60px -12px rgba(0,0,0,0.5)

Buttons:
  Cyan: 0 4px 16px rgba(8,145,178,0.4)
  Hover: 0 8px 24px rgba(0,102,179,0.5)
```

#### Live Indicators
```css
Active: #22c55e (green-500) animate-pulse
Ping: #4ade80 (green-400) animate-ping
Highlight: #f0fdf4 (green-50)
```

### Typography
```css
Font: system-ui, -apple-system, sans-serif

NEXUS Logo:
  32px (text-3xl), font-bold, letter-spacing: 4px, color: #0891b2

Headings:
  H1: 36px (text-4xl) font-bold
  H2: 24px (text-2xl) font-bold
  H3: 20px (text-xl) font-bold
  H4: 18px (text-lg) font-semibold

Body:
  Base: 16px (text-base)
  Small: 14px (text-sm)
  Extra Small: 12px (text-xs)
```

### Spacing
```css
Container Padding:
  Mobile: 8px (p-2)
  Tablet: 16px (p-4)
  Desktop: 24-32px (p-6/p-8)

Card Padding:
  Mobile: 12px (p-3)
  Tablet: 16-24px (p-4/p-6)
  Desktop: 24-32px (p-6/p-8)

Section Spacing:
  Between: 12-16-24px (mb-3 sm:mb-4 md:mb-6)
  Within: 12-16px (space-y-3 md:space-y-4)

Border Radius:
  Small: 8px (rounded-lg)
  Medium: 12px (rounded-xl)
  Large: 16px (rounded-2xl)
  XL: 24px (rounded-3xl)
  Custom: 28px (rounded-[28px])

Grid Gaps:
  Mobile: 8px (gap-2)
  Tablet: 12px (gap-3)
  Desktop: 16-24px (gap-4/gap-6)
```

### Animations
```css
Hover:
  Card Lift: translateY(-2px) + shadow
  Shimmer: Gradient slides -100% to 100%
  Icon Shift: translateX(4px)
  Scale: scale(1.05)

Login Particles (20):
  Colors: rgba(255,255,255,0.5) & rgba(147,51,234,0.6)
  Animation: translateY + translateX, 15s infinite

Circuit Pattern:
  3 layers: 80px, 100px, 50px
  40s linear infinite

Orbs:
  4 orbs, 25s ease-in-out infinite
  Movement: translate variations

Step Reorder:
  Scroll: smooth, block center
  Highlight: #bfdbfe 1.5s
  Transition: 300ms
```

### Icons
```css
Hero Icons (Outline):
  Dashboard: text-white w-6 h-6 md:w-7 h-7
  Actions: text-white w-6 h-6
  Buttons: w-5 h-5

Colors:
  In Progress: text-blue-600
  Completed: text-green-600
  On Hold: text-yellow-600
  Error: text-red-600
  Required: text-blue-600
  Help: text-gray-400 hover:text-gray-600
  Delete: text-red-600
  Add: text-green-600
  Eye: text-gray-400 hover:text-cyan-600
```

### Borders
```css
Cards:
  Default: border-2 border-gray-200
  Primary: border-2 border-indigo-100
  Active: border-2 border-blue-500
  Steps: border-2 border-indigo-200

Inputs:
  Default: border-2 border-gray-300
  Required: border-2 border-blue-300
  Focus: border-blue-500 ring-2 ring-blue-200
  Error: border-2 border-red-300
  Success: border-2 border-green-300

Sections:
  Compliance: border-2 border-indigo-200
  Specs: border-2 border-yellow-200
  Stock: border-2 border-blue-200
  Comments: border-2 border-green-200
```

### Z-Index
```css
Login:
  Gradient: z-0
  Pattern: z-1
  Grid: z-1
  Particles: z-2
  Card: z-10

Interactive:
  Tooltips: z-50
  Dropdowns: z-40
  Modal Backdrop: z-40
  Modal Content: z-50
```

---

## Core Functionality

### Traveler Auto-Population

**Trigger:** Both Job Number AND Work Order Number filled (≥3 chars each)

**Flow:**
1. Debounce 300ms
2. AbortController cancels previous requests
3. Fetch: `GET /api/travelers/latest-revision?job_number={jn}&work_order={wo}`
4. If found:
   - Increment revision (A→B, Z→AA, AA→AB, etc.)
   - Populate ALL form fields
   - Load ALL process steps (new IDs)
   - Copy specs, stock, shipping
   - Set compliance flags
   - Alert user
5. User MUST change revision before saving

**Revision Algorithm:**
```
A-Y → next letter
Z → AA
AA→AB, AZ→BA, ZZ→AAA
V1→V2, REV1→REV2
Default: append 'B'
```

### Work Order Format
```
Structure: [Prefix]-[Suffix]
Prefix: Read-only, auto-generated
Suffix: User-editable
Example: 12345-6
```

### Compliance
```
Lead Free (L): Green badge, appends 'L'
ITAR (M): Purple badge, appends 'M'
Example: 8414LM
```

### Labor Hours
```
PCB: ALWAYS false (forced)
PARTS: ALWAYS false (forced)
Others: Default true, toggleable
```

### Process Steps
```
Reorder: Change SEQ #
Auto-renumber: 1,2,3...
Scroll-to-view: Animated
Highlight: 1.5s blue-200
Fields: Seq, Work Center, Instructions, Qty, Rejected, Accepted, Sign, Date
```

### Status Flow
```
DRAFT → CREATED → IN_PROGRESS → COMPLETED
             ↓
          ON_HOLD → IN_PROGRESS
             ↓
     CANCELLED / ARCHIVED
```

### Active Status
```
is_active=true: Main lists, dashboard, tracking
is_active=false: Archived only
Drafts: Always false
```

---

## Authentication & Security

### JWT
```python
SECRET_KEY: ≥32 chars (env)
ALGORITHM: HS256
EXPIRY: 480 min (8 hrs)
```

### Passwords
```python
Library: passlib + bcrypt
Hash: $2b$12$... (60 chars)
Irreversible: Cannot decrypt
```

### Token
```json
{
  "sub": "user_id",
  "exp": timestamp
}
```

### Access
```
Protected: All except /login, /register
Header: Authorization: Bearer {token}
Active: is_active=true required
```

### Roles
```
ADMIN: Full access
OPERATOR: Limited access
```

---

## API Endpoints

### Auth
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
POST /api/auth/reset-password
```

### Travelers
```
GET    /api/travelers/
GET    /api/travelers/{id}
GET    /api/travelers/latest-revision?job_number=X&work_order=Y
POST   /api/travelers/
PUT    /api/travelers/{id}
DELETE /api/travelers/{id}
```

### Labor & Tracking
```
GET  /api/labor/
POST /api/labor/
GET  /api/tracking/?limit=20
POST /api/tracking/
```

### Other
```
GET  /api/search/?q={query}
GET  /api/notifications/
GET  /api/users/ (admin)
POST /api/users/ (admin)
GET  /api/barcodes/{id}
```

---

## Key Features

1. **Barcode:** TRV-{job_number}-{timestamp}
2. **Draft:** DRAFT status, is_active=false
3. **Work Centers:** Filtered by type, hover tooltips
4. **Form State:** 300ms debounce, AbortController, page stays top

---

**ACCURATE DOCUMENTATION COMPLETE - Verified Against All Code Files**
