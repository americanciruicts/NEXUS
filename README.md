# 🏭 NEXUS - American Circuits Traveler Management System

**Version 1.0.0**
*Complete Digital Traveler Management & Manufacturing Operations Platform*

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [User Roles & Permissions](#user-roles--permissions)
- [Core Functionality](#core-functionality)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Technology Stack](#technology-stack)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

NEXUS is a comprehensive traveler management system designed specifically for American Circuits, Inc. (ACI) to digitize and streamline manufacturing operations. The system provides real-time tracking of PCB assemblies, cables, and mechanical components throughout the entire production lifecycle.

### Key Capabilities

- ✅ **Digital Traveler Management** - Create, track, and manage manufacturing travelers
- ✅ **Barcode & QR Code Integration** - Automated scanning for work center tracking
- ✅ **Real-Time Labor Tracking** - Dual-system time tracking with auto-calculation
- ✅ **Approval Workflows** - Kris and Adam approval system with email notifications
- ✅ **Comprehensive Reporting** - Labor hours, production statistics, and audit trails
- ✅ **Global Search** - Instant search across travelers, work orders, and labor entries
- ✅ **Notification System** - Real-time alerts for admins on all operations
- ✅ **Multi-Type Support** - PCB, ASSY, Cable, Cable Assembly, Mechanical, and Test workflows

---

## 🚀 Features

### 1. Traveler Management

#### Traveler Types
- **PCB** - Printed Circuit Board manufacturing
- **ASSY** - Assembly operations
- **CABLE** - Cable manufacturing
- **PURCHASING** - Procurement and purchasing operations

#### Traveler Statuses
- `DRAFT` - Initial creation
- `CREATED` - Ready for production
- `IN_PROGRESS` - Active manufacturing
- `COMPLETED` - Finished
- `ON_HOLD` - Temporarily paused
- `CANCELLED` - Cancelled
- `ARCHIVED` - Archived for records

#### Priority Levels
- `LOW` - Standard operations
- `NORMAL` - Regular priority (default)
- `HIGH` - Expedited
- `URGENT` - Critical rush orders

#### Features
- Auto-population from job numbers and work order numbers
- Manufacturing process templates by traveler type
- Process steps with sub-steps breakdown
- Manual step additions
- Revision management with auto-increment on clone
- Labor hours inclusion option
- Complete routing information with work centers
- Specifications and logistics tracking
- Barcode and QR code generation per traveler

### 2. Barcode & QR Code System

#### Barcode Features
- **Format:** Code128 barcode encoding
- **Content:** `NEX-{traveler_id}-{job_number}`
- **Scanning:** Validate and extract traveler information
- **Printing:** Generate printable PDF labels

#### QR Code Features
- **Traveler QR Codes:** Contains traveler_id, job_number, part_number, system, company
- **Step QR Codes:** Specific to each routing step for work center tracking
- **Scan In/Out:** Time tracking at each manufacturing step
- **Universal Search:** Search by any barcode or QR code

#### Label Generation
- PDF labels with both barcode and QR code
- Traveler information display
- Creation timestamp
- Print-ready format

### 3. Labor Tracking (Dual System)

#### System 1: Labor Entries
Employee-centric tracking tied to process steps

**Features:**
- Start/pause/stop labor with automatic hours calculation
- Automatic process step matching (fuzzy matching)
- Work center auto-assignment
- Employee tracking by user ID
- Sequence number matching
- Description and notes
- Pause time tracking
- Admin manual entry creation with past dates
- Auto-stop at 5 PM for all active entries

**Reporting:**
- Hours worked per employee
- Weekly breakdown (Monday start)
- Monthly breakdown (YYYY-MM format)
- Daily breakdown
- Total hours per employee
- Filter by date range (7-30 days default)

#### System 2: Traveler Time Entries
Job-centric tracking independent of process steps

**Features:**
- Independent time tracking per job
- Work center specific
- Operator name field
- Start/pause/end functionality
- Pause duration calculation
- Hours worked calculation
- Manual entry creation by admin
- Auto-stop at 5 PM

**Benefits:**
- Track job progress through work centers
- Operator-level visibility
- Flexible time management
- Separate from formal labor entries

### 4. Approval System

#### Request Types
- **EDIT** - Request permission to edit completed/locked traveler
- **COMPLETE** - Request approval to mark traveler complete
- **CANCEL** - Request approval to cancel traveler

#### Approvers
- **Kris** (is_approver = true)
- **Adam** (is_approver = true)
- Any user with `is_approver` flag

#### Workflow
1. User creates approval request with details
2. Email notification sent to all approvers
3. Approvers view pending requests
4. Approve or reject with optional reason
5. User receives notification of decision
6. Audit trail maintained

#### Features
- Email notifications to approvers
- Approval history tracking
- Rejection reason capture
- Request type categorization
- User's request viewing
- Complete audit trail

### 5. Notification System

#### Notification Types
- `TRAVELER_CREATED` - New traveler created
- `TRAVELER_UPDATED` - Traveler modified
- `TRAVELER_DELETED` - Traveler deleted
- `LABOR_ENTRY_CREATED` - New labor entry started
- `LABOR_ENTRY_UPDATED` - Labor entry modified
- `LABOR_ENTRY_DELETED` - Labor entry deleted
- `TRACKING_ENTRY_CREATED` - New time tracking entry
- `TRACKING_ENTRY_UPDATED` - Time tracking modified
- `TRACKING_ENTRY_DELETED` - Time tracking deleted

#### Features
- **Auto-notification to admins** on all operations
- Mark as read/unread
- Mark all as read (batch operation)
- Filter by type and status
- Search functionality
- Reference to related entities (traveler, labor entry, etc.)
- Username of action creator
- Notification count badge
- Delete notifications (admin only)

### 6. Work Centers

#### Categories & Coverage

**PCB Assembly (50+ work centers)**
- KITTING, AUTO INSERTION, HAND SOLDER, WAVE SOLDER
- AOI (Automated Optical Inspection), X-RAY INSPECTION
- E-TEST, FUNCTIONAL TEST, BURN IN
- CONFORMAL COAT, REWORK, FINAL INSPECTION
- LABELING, PACKAGING, SHIPPING

**PCB Manufacturing (18 work centers)**
- DRILLING, PLATING, IMAGING, ETCHING
- SOLDER MASK, LEGEND, ROUTING
- ELECTRICAL TEST, V-SCORING

**Cables (7 work centers)**
- CABLE PREP, WIRE STRIPPING, CRIMPING
- CABLE ASSEMBLY, CABLE TEST, CABLE LABELING

**Purchasing (3 work centers)**
- PROCUREMENT, RECEIVING, INVENTORY

### 7. Search & Filtering

#### Global Search
Search across multiple entities simultaneously:
- **Travelers**: Job number, work order, part number, description, customer
- **Users**: Username, email, name (admin only)
- **Work Orders**: Job number, work order number, part number
- **Labor Entries**: Job number, work center, operator

#### Advanced Filters
- Status-based filtering (by traveler status)
- Date range filtering
- Work center filtering
- Employee/operator filtering
- Priority filtering
- Customer filtering
- Part number search

### 8. Reporting

#### Labor Hours Report
- **Weekly View**: Monday to Sunday breakdown
- **Monthly View**: YYYY-MM format grouping
- **Daily View**: Individual day entries
- **Per Employee**: Total hours per employee
- **Date Range**: Customizable (default 30 days)
- **Export Ready**: Formatted for Excel/CSV export

#### Dashboard Statistics
- Travelers in progress count
- Completed travelers count
- Active labor entries
- Recent travelers (last 5)
- Work center status overview

### 9. User Management

#### User Roles
- **ADMIN**: Full system access, user management, deletions
- **OPERATOR**: Create travelers, track labor, view own data

#### User Features
- Create users with role assignment
- Assign/revoke approver status
- Generate secure random passwords
- Activate/deactivate users (soft delete)
- Password change with verification
- Profile management

### 10. Audit & Compliance

#### Audit Logs
Track every change to travelers:
- Action type (CREATED, UPDATED, DELETED, etc.)
- Field changed
- Old value and new value
- Timestamp
- User who made the change
- IP address
- User agent (browser/device info)

#### Data Integrity
- Soft-delete for users (preserves history)
- Cascading deletes for traveler records
- Transaction-based operations
- Foreign key constraints
- Complete relationship integrity

---

## 🏗️ System Architecture

### Port Configuration (100 Series)
- **Port 100**: Main Application (Nginx reverse proxy)
- **Port 101**: PostgreSQL Database
- **Port 102**: FastAPI Backend API
- **Port 103**: Next.js Frontend

### Architecture Diagram

```
┌─────────────────────────────────┐
│     Nginx (Port 100)            │
│   acidashboard.aci.local:100    │
└────────────┬────────────────────┘
             │
        ┌────┴────┐
        │         │
   ┌────▼─────┐  ┌─▼──────────────┐
   │ Frontend │  │ Backend API    │
   │ Next.js  │  │ FastAPI        │
   │ (103)    │  │ (102)          │
   └──────────┘  └────────┬───────┘
                          │
                   ┌──────▼────────┐
                   │ PostgreSQL    │
                   │ Database      │
                   │ (101)         │
                   └───────────────┘
```

### Technology Stack

#### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT (8-hour tokens)
- **Security**: bcrypt password hashing
- **Barcode**: python-barcode, qrcode, Pillow
- **Email**: SMTP (Gmail/custom)

#### Frontend
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom + Radix UI primitives
- **Icons**: Heroicons
- **State**: React Context API
- **HTTP**: Fetch API with JWT tokens

#### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL with persistent volumes
- **Networking**: Docker internal network

---

## 🚦 Getting Started

### Prerequisites

1. **Docker Desktop** (v4.0+)
   - Download from: https://www.docker.com/products/docker-desktop
   - Ensure Docker Desktop is running

2. **System Requirements**
   - Windows 10/11, macOS 11+, or Linux
   - 8GB RAM (16GB recommended)
   - 10GB available disk space

### Installation

#### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/nexus.git
cd nexus

# Start Docker Desktop first
# Then build and start all services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Option 2: Development Mode

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Database:**
Requires separate PostgreSQL installation at `localhost:3001`

### Access Points

- **Main Application**: http://localhost:100 or http://acidashboard.aci.local:100
- **Backend API**: http://localhost:102
- **API Documentation**: http://localhost:102/docs (Swagger UI)
- **Database**: localhost:101

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | nexus123 |
| Approver | kris | nexus123 |
| Approver | adam | nexus123 |
| Operator | operator1 | nexus123 |

**⚠️ IMPORTANT: Change these passwords in production!**

---

## 👥 User Roles & Permissions

### ADMIN Role
**Full System Access**
- ✅ Create/edit/delete travelers
- ✅ Create/edit users
- ✅ Assign approver status
- ✅ View all labor entries (all employees)
- ✅ Create manual labor entries with past dates
- ✅ Delete labor entries and time entries
- ✅ Delete notifications
- ✅ Access all reports
- ✅ Manage work centers
- ✅ View audit logs

### OPERATOR Role
**Production Operations**
- ✅ Create travelers
- ✅ Edit own travelers
- ✅ Start/stop labor tracking
- ✅ View own labor entries
- ✅ Request approvals
- ✅ Scan barcodes/QR codes
- ✅ View notifications
- ❌ Cannot delete entries
- ❌ Cannot access user management

### APPROVER Status
**Additional Approval Rights** (in addition to base role)
- ✅ View approval requests
- ✅ Approve/reject requests
- ✅ Receive email notifications for approval requests
- Note: Kris and Adam have approver status by default

---

## 📚 Core Functionality

### Creating a Traveler

1. Navigate to **Travelers → Create New**
2. Enter job number (auto-populates if work order exists)
3. Select traveler type (PCB, ASSY, CABLE, etc.)
4. Manufacturing steps auto-populate based on type
5. Fill in part details, customer info, quantities
6. Add specifications, logistics info
7. Select whether to include labor hours table
8. Add manual steps if needed
9. Click **Create Traveler**
10. Barcode and QR code automatically generated

### Starting Labor Tracking

#### Method 1: Manual Entry
1. Go to **Labor Tracking**
2. Click **Start Labor Entry**
3. Enter job number
4. Select/enter work center
5. System auto-matches to process step
6. Timer starts automatically
7. Use **Pause** button if needed
8. Click **Stop** when complete
9. Hours automatically calculated

#### Method 2: QR Code Scan
1. Scan step-specific QR code
2. Select **SCAN_IN** action
3. Work automatically
4. Scan again with **SCAN_OUT** action
5. System calculates time spent

### Requesting Approval

1. Navigate to traveler needing approval
2. Click **Request Approval**
3. Select request type (EDIT/COMPLETE/CANCEL)
4. Provide detailed reason
5. Email sent to Kris and Adam
6. Wait for approval/rejection
7. Check **Notifications** for decision

### Scanning Barcodes/QR Codes

#### Header Barcode Scan
1. Navigate to search bar in header
2. Use barcode scanner or manually type
3. Format: `NEX-{traveler_id}-{job_number}`
4. Press Enter
5. System finds and displays traveler

#### Work Center Step Scan
1. Access traveler detail page
2. Each step has unique QR code
3. Scan QR code at work center
4. Select SCAN_IN when starting
5. Work on the step
6. Scan again and select SCAN_OUT
7. System records time spent

### Viewing Reports

#### Labor Hours Report
1. Go to **Reports → Labor Hours**
2. Select date range (default 30 days)
3. View breakdown:
   - Weekly totals (Monday start)
   - Monthly totals
   - Daily entries
   - Per employee totals
4. Export to Excel/CSV

#### Dashboard Statistics
- Real-time counts updated hourly
- In-progress travelers
- Completed travelers
- Recent activity feed

### Managing Notifications

1. Click **Bell Icon** in header (shows unread count)
2. View all notifications with timestamps
3. Filter by:
   - Type (traveler, labor, tracking)
   - Status (read/unread)
4. Click notification to view details
5. Mark as read individually
6. Or **Mark All as Read**
7. Admins can delete notifications

---

## 🔌 API Documentation

### Base URL
```
http://localhost:102
```

### Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Authentication Endpoints

#### POST /auth/login
Login and receive JWT token

**Request:**
```json
{
  "username": "admin",
  "password": "nexus123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@aci.com",
    "role": "ADMIN",
    "is_approver": true
  }
}
```

#### GET /auth/me
Get current user information

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@aci.com",
  "first_name": "Admin",
  "last_name": "User",
  "role": "ADMIN",
  "is_approver": true,
  "is_active": true
}
```

### Traveler Endpoints

#### GET /travelers/
List all travelers with pagination

**Query Parameters:**
- `skip` (int): Offset for pagination (default: 0)
- `limit` (int): Number of results (default: 100)
- `status` (string): Filter by status
- `work_center` (string): Filter by work center

#### POST /travelers/
Create new traveler

**Request Body:**
```json
{
  "job_number": "JOB-12345",
  "work_order_number": "WO-12345",
  "po_number": "PO-12345",
  "traveler_type": "ASSY",
  "part_number": "8414L",
  "part_description": "PCB Assembly",
  "revision": "A",
  "quantity": 100,
  "customer_code": "CUST001",
  "customer_name": "Customer Name",
  "priority": "NORMAL",
  "work_center": "ASSEMBLY",
  "include_labor_hours": true,
  "process_steps": [
    {
      "step_number": 1,
      "operation": "KITTING",
      "work_center_code": "KITTING",
      "instructions": "Kit all components",
      "estimated_time": 30
    }
  ]
}
```

#### GET /travelers/{traveler_id}
Get traveler by ID with all process steps

#### GET /travelers/by-job/{job_number}
Get traveler by job number

#### PUT /travelers/{traveler_id}
Update traveler (requires approval for completed travelers)

#### DELETE /travelers/{traveler_id}
Delete traveler and all related records (admin only)

### Labor Tracking Endpoints

#### POST /labor/
Start new labor entry

**Request:**
```json
{
  "traveler_id": 1,
  "job_number": "JOB-12345",
  "work_center": "ASSEMBLY",
  "description": "Working on assembly"
}
```

#### PUT /labor/{labor_id}
Stop/complete labor entry

**Request:**
```json
{
  "end_time": "2025-01-29T17:00:00Z"
}
```

**Response includes calculated hours_worked**

#### GET /labor/my-entries
Get current user's labor entries

**Query Parameters:**
- `days` (int): Number of days to look back (default: 7)

#### GET /labor/hours-summary
Get detailed labor hours report

**Query Parameters:**
- `days` (int): Date range (default: 30)

### Barcode/QR Code Endpoints

#### GET /barcodes/traveler/{traveler_id}
Generate barcode and QR code (no auth required)

**Response:**
```json
{
  "traveler_id": 1,
  "job_number": "JOB-12345",
  "barcode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

#### GET /barcodes/traveler/{traveler_id}/label
Generate printable PDF label

**Response:** PDF file download

#### POST /barcodes/scan/step
Scan in/out of work center step

**Request:**
```json
{
  "step_id": 1,
  "scan_action": "SCAN_IN",
  "notes": "Starting work"
}
```

### Approval Endpoints

#### POST /approvals/
Create approval request

**Request:**
```json
{
  "traveler_id": 1,
  "request_type": "EDIT",
  "request_details": "Need to update quantity from 100 to 150"
}
```

#### GET /approvals/
Get pending approvals (approvers only)

#### POST /approvals/{approval_id}/approve
Approve request (Kris/Adam only)

#### POST /approvals/{approval_id}/reject
Reject request with reason

**Request:**
```json
{
  "rejection_reason": "Insufficient justification"
}
```

### Notification Endpoints

#### GET /notifications/
Get user's notifications

**Query Parameters:**
- `skip` (int): Pagination offset
- `limit` (int): Results per page (default: 50)
- `unread_only` (bool): Show only unread (default: false)

#### GET /notifications/stats
Get notification counts

**Response:**
```json
{
  "total": 45,
  "unread": 5
}
```

#### PUT /notifications/{notification_id}
Mark as read/unread

**Request:**
```json
{
  "is_read": true
}
```

#### POST /notifications/mark-all-read
Mark all notifications as read

### Search Endpoints

#### GET /search/?q={query}
Global search across all entities

**Response:**
```json
{
  "travelers": [...],
  "users": [...],
  "work_orders": [...],
  "labor_entries": [...]
}
```

### Complete API Documentation
Access interactive Swagger UI documentation at:
**http://localhost:102/docs**

---

## 🗄️ Database Schema

### Core Tables

#### users
- Primary user account information
- Role-based access control
- Approver flag
- Password hashing with bcrypt

#### travelers
- Main traveler information
- Job number, work order, part details
- Status and priority tracking
- Customer and logistics information
- Foreign keys: created_by → users, part_id → parts

#### process_steps
- Manufacturing routing steps
- Work center assignments
- Estimated time per step
- Completion tracking
- Sub-steps support
- Foreign keys: traveler_id → travelers, work_center_code → work_centers

#### sub_steps
- Detailed sub-steps within process steps
- Step numbering (1.1, 1.2, etc.)
- Completion tracking
- Foreign key: process_step_id → process_steps

#### manual_steps
- User-added custom steps
- Not part of standard template
- Foreign keys: traveler_id → travelers, added_by → users

#### labor_entries
- Employee labor tracking
- Start/pause/end times
- Hours calculation
- Process step matching
- Foreign keys: traveler_id → travelers, employee_id → users, step_id → process_steps

#### traveler_time_entries
- Independent time tracking
- Operator-specific
- Work center based
- Pause duration tracking
- Foreign keys: traveler_id → travelers, created_by → users

#### work_centers
- Manufacturing work center definitions
- Unique codes
- Active status

#### parts
- Part master data
- Part number, description, revision
- Customer associations

#### approvals
- Approval request workflow
- Request types and status
- Approval/rejection tracking
- Foreign keys: traveler_id → travelers, requested_by/approved_by/rejected_by → users

#### audit_logs
- Complete change tracking
- Field-level auditing
- User and timestamp
- IP and user agent
- Foreign keys: traveler_id → travelers, user_id → users

#### traveler_tracking_logs
- Barcode/QR scan events
- Work center tracking
- Scan timestamps
- Foreign key: traveler_id → travelers

#### step_scan_events
- Step-level scan in/out
- Duration calculation
- Time tracking per step
- Foreign keys: traveler_id → travelers, scanned_by → users

#### notifications
- User notification queue
- Type categorization
- Read status tracking
- Reference to related entities
- Foreign key: user_id → users

#### work_orders
- Work order master data
- Auto-population source
- Process templates

### Entity Relationships

```
users (1) ──< (N) travelers (created_by)
users (1) ──< (N) labor_entries (employee_id)
users (1) ──< (N) audit_logs
users (1) ──< (N) notifications

travelers (1) ──< (N) process_steps
travelers (1) ──< (N) manual_steps
travelers (1) ──< (N) labor_entries
travelers (1) ──< (N) traveler_time_entries
travelers (1) ──< (N) approvals
travelers (1) ──< (N) audit_logs
travelers (1) ──< (N) traveler_tracking_logs
travelers (1) ──< (N) step_scan_events

process_steps (1) ──< (N) sub_steps
process_steps (1) ──< (N) labor_entries

work_centers (1) ──< (N) process_steps
parts (1) ──< (N) travelers
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file in backend directory:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/nexus

# JWT Secret (change in production!)
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=8

# Email (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@company.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=nexus@aci.com
SMTP_FROM_NAME=NEXUS System

# Application
BACKEND_URL=http://localhost:102
FRONTEND_URL=http://localhost:100
```

### Frontend Configuration

Edit `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:102
NEXT_PUBLIC_APP_NAME=NEXUS
NEXT_PUBLIC_COMPANY=American Circuits
```

### Docker Compose Ports

Edit `docker-compose.yml` to change ports:

```yaml
services:
  nginx:
    ports:
      - "100:80"  # Change 100 to desired port

  backend:
    ports:
      - "102:8000"  # Change 102 to desired port

  frontend:
    ports:
      - "103:3000"  # Change 103 to desired port

  db:
    ports:
      - "101:5432"  # Change 101 to desired port
```

---

## 🐛 Troubleshooting

### Docker Issues

#### Docker Desktop Not Running
```bash
Error: "Cannot connect to Docker daemon"
Solution: Start Docker Desktop application and wait for it to fully start
```

#### Port Already in Use
```bash
Error: "Bind for 0.0.0.0:100 failed: port is already allocated"

Solution:
# Stop all containers
docker-compose down

# Find what's using the port (Windows)
netstat -ano | findstr :100

# Find what's using the port (Linux/Mac)
lsof -i :100

# Kill the process or change NEXUS port in docker-compose.yml
```

#### Container Won't Start
```bash
# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Database Issues

#### Connection Refused
```bash
Solution:
1. Ensure PostgreSQL container is running: docker-compose ps
2. Check DATABASE_URL in .env file
3. Restart database: docker-compose restart db
```

#### Database Not Initialized
```bash
# Reset database (WARNING: Deletes all data)
docker-compose down -v
docker-compose up --build -d

# Or manually run migrations
docker-compose exec backend python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"
```

### Backend Issues

#### Import Errors
```bash
# Reinstall dependencies
docker-compose exec backend pip install -r requirements.txt

# Or rebuild
docker-compose build backend
```

#### Seed Data Not Loading
```bash
# Manually run seed script
docker-compose exec backend python -c "from seed_data.seed_travelers import seed_travelers; seed_travelers()"
```

### Frontend Issues

#### Build Failures
```bash
# Clear cache and rebuild
docker-compose exec frontend rm -rf .next
docker-compose exec frontend npm install
docker-compose restart frontend
```

#### API Connection Issues
```bash
# Check NEXT_PUBLIC_API_URL in .env.local
# Should match backend URL
# Restart frontend after .env changes
docker-compose restart frontend
```

### Authentication Issues

#### JWT Token Expired
```
Solution: Login again. Tokens expire after 8 hours.
```

#### Cannot Login with Default Credentials
```bash
# Reset admin password
docker-compose exec backend python update_passwords.py
```

### Performance Issues

#### Slow Queries
```bash
# Check database indexes
docker-compose exec db psql -U postgres -d nexus -c "\d+ travelers"

# Analyze query performance
docker-compose exec db psql -U postgres -d nexus -c "EXPLAIN ANALYZE SELECT * FROM travelers LIMIT 10;"
```

#### High Memory Usage
```bash
# Check container stats
docker stats

# Restart containers
docker-compose restart
```

---

## 📞 Support & Maintenance

### Logs Location
```bash
# View all logs
docker-compose logs

# View specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Follow logs in real-time
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Backup Database
```bash
# Backup
docker-compose exec db pg_dump -U postgres nexus > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T db psql -U postgres nexus < backup_20250129.sql
```

### Update System
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

### Clean Up
```bash
# Remove all containers and volumes
docker-compose down -v

# Remove unused Docker resources
docker system prune -a

# Remove specific container
docker-compose rm -f backend
```

---

## 📖 Additional Documentation

- **API Documentation**: http://localhost:102/docs
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Database Schema**: See models.py
- **Work Center List**: See seed_data/seed_travelers.py

---

## 🔐 Security Considerations

### Production Deployment
1. **Change all default passwords**
2. **Update SECRET_KEY in .env**
3. **Configure CORS properly** (remove `allow_origins=["*"]`)
4. **Use HTTPS** with SSL certificates
5. **Set up firewall rules**
6. **Regular database backups**
7. **Enable audit logging**
8. **Implement rate limiting**
9. **Use environment-specific .env files**
10. **Regular security updates**

---

## 📝 License

Proprietary - American Circuits, Inc. (ACI)
All rights reserved.

---

## 🤝 Credits

**Developed for American Circuits, Inc.**
*Manufacturing Excellence Through Digital Innovation*

---

**Version:** 1.0.0
**Last Updated:** January 2026
**System Status:** Production Ready ✅
