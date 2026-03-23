from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import uvicorn
import re

from database import engine, get_db
from models import Base
from routers import travelers, users, work_orders, approvals, labor, auth, barcodes, traveler_tracking, notifications, search, dashboard, work_centers

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("NEXUS Backend starting up...")

    # Run seed data
    try:
        from seed_data.seed_travelers import seed_travelers
        print("Running seed data...")
        seed_travelers()
    except Exception as e:
        print(f"Warning: Could not run seed data: {e}")

    # Seed work centers if table is empty
    try:
        from database import SessionLocal
        from models import WorkCenter
        db = SessionLocal()
        if db.query(WorkCenter).count() == 0:
            print("Seeding work centers from static data...")
            WORK_CENTER_DATA = {
                "PCB_ASSEMBLY": [
                    ("ENGINEERING", "Reverse engineering and design"),
                    ("GENERATE CAD", "Generate CAD design files"),
                    ("VERIFY BOM", "Verify no BOM or rev changes"),
                    ("GENERATE GERBER", "Generate Gerber files for PCB fabrication"),
                    ("VERIFY GERBER", "Verify Gerber files for accuracy"),
                    ("MAKE SILKSCREEN", "Create silkscreen layer for component identification"),
                    ("CREATE BOM", "Create Bill of Materials for the assembly"),
                    ("KITTING", "Pull parts from inventory to place in a kit for manufacturing"),
                    ("COMPONENT PREP", "Pre-bending of parts or any necessary alteration of a part prior to production"),
                    ("PROGRAM PART", "Parts that need to be programmed prior to SMT"),
                    ("HAND SOLDER", "Anything that must be soldered by hand, no wave, no SMT"),
                    ("SMT PROGRAMING", "Programming the SMT placement machine"),
                    ("FEEDER LOAD", "The time it takes to load all needed parts onto feeders/Matrix trays"),
                    ("SMT SET UP", "The time it takes to align parts/make needed changes to programs"),
                    ("GLUE", "Gluing done at SMT after paste to make sure parts stay on"),
                    ("SMT TOP", "SMT top placed"),
                    ("SMT BOTTOM", "SMT bottom placed"),
                    ("WASH", "Process of cleaning a dirty PCB"),
                    ("X-RAY", "Visual continuity check of components as requested by customer"),
                    ("MANUAL INSERTION", "Install prepared parts before wave"),
                    ("WAVE", "Wave soldering process"),
                    ("WASH", "Post-wave cleaning process"),
                    ("CLEAN TEST", "Use the ion tester to check cleanliness"),
                    ("TRIM", "Cut excess leads on backside"),
                    ("PRESS FIT", "Use pressure to insert a part on the PCB"),
                    ("HAND ASSEMBLY", "Assembly of parts after wave but before inspection"),
                    ("AOI PROGRAMMING", "Programming the AOI machine"),
                    ("AOI", "Automated Optical Inspection of the PCB"),
                    ("SECONDARY ASSEMBLY", "Anything assembled after ESS testing or inspection"),
                    ("EPOXY", "Anything that needs to be glued or epoxied"),
                    ("INTERNAL TESTING", "In house test at ACI"),
                    ("LABELING", "Place a label on the board per BOM instructions"),
                    ("DEPANEL", "Break panel into individual boards"),
                    ("PRODUCT PICTURES", "Take pictures of product before shipping"),
                    ("SEND TO EXTERNAL COATING", "Operator to sign and ship to coating"),
                    ("RETURN FROM EXTERNAL COATING", "Operator to sign when received from coating"),
                    ("INTERNAL COATING", "In house coating at ACI"),
                    ("INTERNAL TESTING", "Post-coating in house test at ACI"),
                    ("SEND TO ESS", "Operator to sign and ship to ESS"),
                    ("RETURN FROM ESS", "Operator to sign when received from ESS"),
                    ("INTERNAL TESTING", "Post-ESS in house test at ACI"),
                    ("VISUAL INSPECTION", "Human visual inspection parts and coating, no AOI"),
                    ("MANUAL ASSEMBLY", "Put the assembly together by hand"),
                    ("BOX ASSEMBLY", "Mechanical build consisting of the PCBA, hardware, and/or housings"),
                    ("HARDWARE", "Adding screws, nuts, bolts, brackets, displays, etc."),
                    ("SHIPPING", "Send product to customer per packing request"),
                ],
                "PCB": [
                    ("COMPONENT PREP", "Pre-bending of parts or any necessary alteration of a part prior to production"),
                    ("EPOXY", "Anything that needs to be glued or epoxied"),
                    ("PRODUCT PICTURES", "Take pictures of product before shipping"),
                    ("INTERNAL COATING", "In house coating at ACI"),
                    ("VISUAL INSPECTION", "Human visual inspection parts and coating, no AOI"),
                    ("SHIPPING", "Send product to customer per packing request"),
                    ("JOB NUMBER", "ACI job number"),
                    ("NUMBER OF LAYERS", "Quantity of different board layers"),
                    ("BOARD SIZE", "Physical dimensions of the board"),
                    ("MATERIAL", "The base material/foundation of the board"),
                    ("BOARD THICKNESS", "Overall thickness of the printed circuit board"),
                    ("COPPER THICKNESS", "Thickness of the conductive copper layer"),
                    ("GOLD", "ENIG surface finish/plating"),
                    ("HAL/HASL/LF HASL", "Surface finish/plating"),
                    ("GOLD FINGERS", "Gold contacts on outer edge of board"),
                    ("CSINK", "Countersink holes"),
                    ("BLIND & BURIED VIAS", "Blind and buried vias connecting layers"),
                    ("GENERATE GERBER/PANELIZATION", "Create zip file for PCB vendor with specs"),
                    ("ORDER/PURCHASE PCB", "Name of the PCB vendor and quantity needed"),
                    ("RECEIVING", "Receive parts from vendors and put into ACI inventory"),
                    ("VSCORE", "Use a machine to break a panel into individual boards"),
                    ("FINAL INSPECTION", "Sample inspection of the PCB artwork by Quality Control"),
                ],
                "CABLE": [
                    ("VERIFY BOM", "Verify no BOM or rev changes"),
                    ("KITTING", "Pull parts from inventory to place in a kit for manufacturing"),
                    ("COMPONENT PREP", "Pre-bending of parts or any necessary alteration of a part prior to production"),
                    ("HAND SOLDER", "Anything that must be soldered by hand, no wave, no SMT"),
                    ("MANUAL INSERTION", "Install prepared parts"),
                    ("HAND ASSEMBLY", "Assembly of parts after wave but before inspection"),
                    ("SECONDARY ASSEMBLY", "Anything assembled after testing or inspection"),
                    ("EPOXY", "Anything that needs to be glued or epoxied"),
                    ("LABELING", "Place a label per instructions"),
                    ("PRODUCT PICTURES", "Take pictures of product before shipping"),
                    ("VISUAL INSPECTION", "Human visual inspection parts and coating, no AOI"),
                    ("MANUAL ASSEMBLY", "Put the assembly together by hand"),
                    ("BOX ASSEMBLY", "Mechanical build consisting of the PCBA, hardware, and/or housings"),
                    ("HARDWARE", "Adding screws, nuts, bolts, brackets, displays, etc."),
                    ("SHIPPING", "Send product to customer per packing request"),
                    ("WIRE CUT", "Cut wire to length needed"),
                    ("STRIP WIRE", "Remove insulation to necessary length"),
                    ("HEAT SHRINK", "Cut and shrink (heat shrink or flex loom)"),
                    ("TINNING", "Dip wire end into solder"),
                    ("CRIMPING", "Fold into ridges by pinching together"),
                    ("INSERT", "Install pins into connector"),
                    ("PULL TEST", "Make sure crimps don't fall off"),
                ],
                "PURCHASING": [
                    ("ENGINEERING", "Reverse engineering and design"),
                    ("MAKE BOM", "Create or update Bill of Materials"),
                    ("PURCHASING", "Procure parts in sufficient quantities for build"),
                    ("QUOTE", "Estimation of material, labor, and PCB costs"),
                    ("INVENTORY", "Add to inventory and track stock levels"),
                ],
            }
            count = 0
            for wc_type, items in WORK_CENTER_DATA.items():
                for idx, (name, desc) in enumerate(items):
                    code = f"{wc_type}_{name.replace(' ', '_').replace('/', '_').replace('&', 'AND').upper()}"
                    wc = WorkCenter(name=name, code=code, description=desc, traveler_type=wc_type, sort_order=idx + 1, is_active=True)
                    db.add(wc)
                    count += 1
            db.commit()
            print(f"✅ Seeded {count} work centers")
        else:
            print(f"Work centers already exist ({db.query(WorkCenter).count()} found)")
        db.close()
    except Exception as e:
        print(f"Warning: Could not seed work centers: {e}")

    # Auto-migrate: add category column to work_centers if missing
    try:
        from sqlalchemy import text, inspect
        with engine.connect() as conn:
            inspector = inspect(engine)
            columns = [c['name'] for c in inspector.get_columns('work_centers')]
            if 'category' not in columns:
                conn.execute(text("ALTER TABLE work_centers ADD COLUMN category VARCHAR(100)"))
                conn.commit()
                print("Added 'category' column to work_centers table")

                # Set default categories based on spreadsheet mapping
                CATEGORY_MAP = {
                    'PROGRAM PART': 'SMT hrs. Actual',
                    'SMT PROGRAMING': 'SMT hrs. Actual',
                    'SMT PROGRAMMING': 'SMT hrs. Actual',
                    'FEEDER LOAD': 'SMT hrs. Actual',
                    'SMT SET UP': 'SMT hrs. Actual',
                    'WASH (POST-WAVE)': 'HAND hrs. Actual',
                    'INTERNAL TESTING (POST-COATING)': 'E-TEST hrs. Actual',
                    'INTERNAL TESTING (POST-ESS)': 'E-TEST hrs. Actual',
                    'GLUE': 'SMT hrs. Actual',
                    'SMT TOP': 'SMT hrs. Actual',
                    'SMT BOTTOM': 'SMT hrs. Actual',
                    'HAND SOLDER': 'HAND hrs. Actual',
                    'WASH': 'HAND hrs. Actual',
                    'TRIM': 'HAND hrs. Actual',
                    'HAND ASSEMBLY': 'HAND hrs. Actual',
                    'EPOXY': 'HAND hrs. Actual',
                    'DEPANEL': 'HAND hrs. Actual',
                    'INTERNAL COATING': 'HAND hrs. Actual',
                    'BOX ASSEMBLY': 'HAND hrs. Actual',
                    'MANUAL INSERTION': 'TH hrs. Actual',
                    'WAVE': 'TH hrs. Actual',
                    'MANUAL ASSEMBLY': 'TH hrs. Actual',
                    'AOI PROGRAMMING': 'AOI & Final Inspection, QC hrs. Actual',
                    'AOI': 'AOI & Final Inspection, QC hrs. Actual',
                    'VISUAL INSPECTION': 'AOI & Final Inspection, QC hrs. Actual',
                    'FINAL INSPECTION': 'AOI & Final Inspection, QC hrs. Actual',
                    'INTERNAL TESTING': 'E-TEST hrs. Actual',
                    'LABELING': 'Labelling, Packaging, Shipping hrs. Actual',
                    'HARDWARE': 'Labelling, Packaging, Shipping hrs. Actual',
                    'SHIPPING': 'Labelling, Packaging, Shipping hrs. Actual',
                    'WIRE CUT': 'HAND hrs. Actual',
                    'STRIP WIRE': 'HAND hrs. Actual',
                    'HEAT SHRINK': 'HAND hrs. Actual',
                    'TINNING': 'HAND hrs. Actual',
                    'CRIMPING': 'HAND hrs. Actual',
                    'INSERT': 'HAND hrs. Actual',
                    'PULL TEST': 'HAND hrs. Actual',
                }
                for name, cat in CATEGORY_MAP.items():
                    conn.execute(
                        text("UPDATE work_centers SET category = :cat WHERE UPPER(TRIM(name)) = :name"),
                        {"cat": cat, "name": name.upper().strip()}
                    )
                conn.commit()
                print("Applied default category values to work centers")
    except Exception as e:
        print(f"Warning: Could not auto-migrate category column: {e}")

    # Auto-migrate: add department column to work_centers if missing
    try:
        from sqlalchemy import text, inspect as sa_inspect
        with engine.connect() as conn:
            insp = sa_inspect(engine)
            columns = [c['name'] for c in insp.get_columns('work_centers')]
            if 'department' not in columns:
                conn.execute(text("ALTER TABLE work_centers ADD COLUMN department VARCHAR(100)"))
                conn.commit()
                print("Added 'department' column to work_centers table")

            # Seed department values based on work center name mapping
            DEPARTMENT_MAP = {
                'VERIFY BOM': 'Engineering/Prep',
                'KITTING': 'Receiving',
                'COMPONENT PREP': 'TH',
                'PROGRAM PART': 'Test/Soldering',
                'HAND SOLDER': 'Soldering',
                'SMT PROGRAMING': 'SMT',
                'SMT PROGRAMMING': 'SMT',
                'FEEDER LOAD': 'SMT',
                'SMT SET UP': 'SMT',
                'WASH (POST-WAVE)': 'ALL',
                'INTERNAL TESTING (POST-COATING)': 'Test',
                'INTERNAL TESTING (POST-ESS)': 'Test',
                'GENERATE CAD': 'Engineering/Prep',
                'GENERATE GERBER': 'Engineering/Prep',
                'VERIFY GERBER': 'Engineering/Prep',
                'MAKE SILKSCREEN': 'Engineering/Prep',
                'CREATE BOM': 'Engineering/Prep',
                'GLUE': 'SMT',
                'SMT TOP': 'SMT',
                'SMT BOTTOM': 'SMT',
                'WASH': 'ALL',
                'X-RAY': 'SMT/Soldering/Test',
                'MANUAL INSERTION': 'TH',
                'WAVE': 'TH',
                'CLEAN TEST': 'ALL',
                'TRIM': 'TH/Soldering',
                'PRESS FIT': 'Soldering',
                'HAND ASSEMBLY': 'TH',
                'AOI PROGRAMMING': 'Quality',
                'AOI': 'Quality',
                'SECONDARY ASSEMBLY': 'Soldering',
                'EPOXY': 'ALL',
                'INTERNAL TESTING': 'Test',
                'LABELING': 'Shipping',
                'DEPANEL': 'Shipping',
                'PRODUCT PICTURES': 'Quality/Shipping/Test',
                'SEND TO EXTERNAL COATING': 'Shipping',
                'RETURN FROM EXTERNAL COATING': 'Receiving/Test',
                'INTERNAL COATING': 'Coating',
                'SEND TO ESS': 'Shipping',
                'RETURN FROM ESS': 'Receiving/Test',
                'VISUAL INSPECTION': 'Quality',
                'FINAL INSPECTION': 'Quality',
                'MANUAL ASSEMBLY': 'Soldering/Cable',
                'BOX ASSEMBLY': 'Soldering/Cable',
                'HARDWARE': 'Soldering/Cable',
                'SHIPPING': 'Shipping',
                'WIRE CUT': 'Cable',
                'STRIP WIRE': 'Cable',
                'HEAT SHRINK': 'Cable',
                'TINNING': 'Cable',
                'CRIMPING': 'Cable',
                'INSERT': 'Cable',
                'PULL TEST': 'Cable',
                'ENGINEERING': 'Engineering/Prep',
                'GENERATE CAD': 'Engineering/Prep',
                'GENERATE GERBER': 'Engineering/Prep',
                'VERIFY GERBER': 'Engineering/Prep',
                'MAKE SILKSCREEN': 'Engineering/Prep',
                'PROGRAM AOI': 'Quality',
                'RECEIVING': 'Receiving',
                'GENERATE GERBER/PANELIZATION': 'Engineering/Prep',
                'ORDER/PURCHASE PCB': 'Purchasing',
                'VSCORE': 'Shipping',
                'MAKE BOM': 'Engineering/Prep',
                'PURCHASING': 'Purchasing',
                'QUOTE': 'Purchasing',
                'INVENTORY': 'Receiving',
            }
            with engine.connect() as conn2:
                for name, dept in DEPARTMENT_MAP.items():
                    conn2.execute(
                        text("UPDATE work_centers SET department = :dept WHERE UPPER(TRIM(name)) = :name AND (department IS NULL OR department = '')"),
                        {"dept": dept, "name": name.upper().strip()}
                    )
                conn2.commit()
            print("Applied department values to work centers")
    except Exception as e:
        print(f"Warning: Could not auto-migrate department column: {e}")

    # Auto-migrate: add qty_completed column to labor_entries and traveler_time_entries if missing
    try:
        from sqlalchemy import text, inspect as sa_inspect2
        with engine.connect() as conn:
            insp = sa_inspect2(engine)
            labor_cols = [c['name'] for c in insp.get_columns('labor_entries')]
            if 'qty_completed' not in labor_cols:
                conn.execute(text("ALTER TABLE labor_entries ADD COLUMN qty_completed INTEGER"))
                conn.commit()
                print("Added 'qty_completed' column to labor_entries table")

            tracking_cols = [c['name'] for c in insp.get_columns('traveler_time_entries')]
            if 'qty_completed' not in tracking_cols:
                conn.execute(text("ALTER TABLE traveler_time_entries ADD COLUMN qty_completed INTEGER"))
                conn.commit()
                print("Added 'qty_completed' column to traveler_time_entries table")
    except Exception as e:
        print(f"Warning: Could not auto-migrate qty_completed column: {e}")

    # Migration v2: Wipe all PCB_ASSEMBLY work centers and reinsert exact 47 in order
    try:
        from database import SessionLocal
        from models import WorkCenter
        db = SessionLocal()

        # Delete ALL existing PCB_ASSEMBLY work centers
        deleted = db.query(WorkCenter).filter(WorkCenter.traveler_type == 'PCB_ASSEMBLY').delete()
        db.commit()
        print(f"Deleted {deleted} old PCB_ASSEMBLY work centers")

        # Exact 47 work centers in order: (name, description, department, category)
        PCB_ASSY = [
            ('ENGINEERING', 'Reverse engineering and design', 'Engineering/Prep', None),
            ('GENERATE CAD', 'Generate CAD design files', 'Engineering/Prep', None),
            ('VERIFY BOM', 'Verify no BOM or rev changes', 'Engineering/Prep', None),
            ('GENERATE GERBER', 'Generate Gerber files for PCB fabrication', 'Engineering/Prep', None),
            ('VERIFY GERBER', 'Verify Gerber files for accuracy', 'Engineering/Prep', None),
            ('MAKE SILKSCREEN', 'Create silkscreen layer for component identification', 'Engineering/Prep', None),
            ('CREATE BOM', 'Create Bill of Materials for the assembly', 'Engineering/Prep', None),
            ('KITTING', 'Pull parts from inventory to place in a kit for manufacturing', 'Receiving', None),
            ('COMPONENT PREP', 'Pre-bending of parts or any necessary alteration of a part prior to production', 'TH', None),
            ('PROGRAM PART', 'Parts that need to be programmed prior to SMT', 'Test/Soldering', 'SMT hrs. Actual'),
            ('HAND SOLDER', 'Anything that must be soldered by hand, no wave, no SMT', 'Soldering', 'HAND hrs. Actual'),
            ('SMT PROGRAMING', 'Programming the SMT placement machine', 'SMT', 'SMT hrs. Actual'),
            ('FEEDER LOAD', 'The time it takes to load all needed parts onto feeders/Matrix trays', 'SMT', 'SMT hrs. Actual'),
            ('SMT SET UP', 'The time it takes to align parts/make needed changes to programs', 'SMT', 'SMT hrs. Actual'),
            ('GLUE', 'Gluing done at SMT after paste to make sure parts stay on', 'SMT', 'SMT hrs. Actual'),
            ('SMT TOP', 'SMT top placed', 'SMT', 'SMT hrs. Actual'),
            ('SMT BOTTOM', 'SMT bottom placed', 'SMT', 'SMT hrs. Actual'),
            ('WASH', 'Process of cleaning a dirty PCB', 'ALL', 'HAND hrs. Actual'),
            ('X-RAY', 'Visual continuity check of components as requested by customer', 'SMT/Soldering/Test', None),
            ('MANUAL INSERTION', 'Install prepared parts before wave', 'TH', 'TH hrs. Actual'),
            ('WAVE', 'Wave soldering process', 'TH', 'TH hrs. Actual'),
            ('WASH', 'Post-wave cleaning process', 'ALL', 'HAND hrs. Actual'),
            ('CLEAN TEST', 'Use the ion tester to check cleanliness', 'ALL', None),
            ('TRIM', 'Cut excess leads on backside', 'TH/Soldering', 'HAND hrs. Actual'),
            ('PRESS FIT', 'Use pressure to insert a part on the PCB', 'Soldering', None),
            ('HAND ASSEMBLY', 'Assembly of parts after wave but before inspection', 'TH', 'HAND hrs. Actual'),
            ('AOI PROGRAMMING', 'Programming the AOI machine', 'Quality', 'AOI & Final Inspection, QC hrs. Actual'),
            ('AOI', 'Automated Optical Inspection of the PCB', 'Quality', 'AOI & Final Inspection, QC hrs. Actual'),
            ('SECONDARY ASSEMBLY', 'Anything assembled after ESS testing or inspection', 'Soldering', None),
            ('EPOXY', 'Anything that needs to be glued or epoxied', 'ALL', 'HAND hrs. Actual'),
            ('INTERNAL TESTING', 'In house test at ACI', 'Test', 'E-TEST hrs. Actual'),
            ('LABELING', 'Place a label on the board per BOM instructions', 'Shipping', 'Labelling, Packaging, Shipping hrs. Actual'),
            ('DEPANEL', 'Break panel into individual boards', 'Shipping', 'HAND hrs. Actual'),
            ('PRODUCT PICTURES', 'Take pictures of product before shipping', 'Quality/Shipping/Test', None),
            ('SEND TO EXTERNAL COATING', 'Operator to sign and ship to coating', 'Shipping', None),
            ('RETURN FROM EXTERNAL COATING', 'Operator to sign when received from coating', 'Receiving/Test', None),
            ('INTERNAL COATING', 'In house coating at ACI', 'Coating', 'HAND hrs. Actual'),
            ('INTERNAL TESTING', 'Post-coating in house test at ACI', 'Test', 'E-TEST hrs. Actual'),
            ('SEND TO ESS', 'Operator to sign and ship to ESS', 'Shipping', None),
            ('RETURN FROM ESS', 'Operator to sign when received from ESS', 'Receiving/Test', None),
            ('INTERNAL TESTING', 'Post-ESS in house test at ACI', 'Test', 'E-TEST hrs. Actual'),
            ('VISUAL INSPECTION', 'Human visual inspection parts and coating, no AOI', 'Quality', 'AOI & Final Inspection, QC hrs. Actual'),
            ('MANUAL ASSEMBLY', 'Put the assembly together by hand', 'Soldering/Cable', 'TH hrs. Actual'),
            ('BOX ASSEMBLY', 'Mechanical build consisting of the PCBA, hardware, and/or housings', 'Soldering/Cable', 'HAND hrs. Actual'),
            ('HARDWARE', 'Adding screws, nuts, bolts, brackets, displays, etc.', 'Soldering/Cable', 'Labelling, Packaging, Shipping hrs. Actual'),
            ('FINAL INSPECTION', 'Final quality inspection before shipping', 'Quality', 'AOI & Final Inspection, QC hrs. Actual'),
            ('SHIPPING', 'Send product to customer per packing request', 'Shipping', 'Labelling, Packaging, Shipping hrs. Actual'),
        ]

        for idx, (name, desc, dept, cat) in enumerate(PCB_ASSY):
            code = f"PCB_ASSEMBLY_{idx+1:02d}_{name.replace(' ', '_').replace('/', '_').replace('&', 'AND').upper()}"
            db.add(WorkCenter(
                name=name, code=code, description=desc,
                traveler_type='PCB_ASSEMBLY', department=dept,
                category=cat, sort_order=idx + 1, is_active=True
            ))
        db.commit()
        print(f"Inserted {len(PCB_ASSY)} PCB_ASSEMBLY work centers in exact order")
        db.close()
    except Exception as e:
        print(f"Warning: Could not run work center migration: {e}")

    yield
    # Shutdown
    print("NEXUS Backend shutting down...")

app = FastAPI(
    title="NEXUS API",
    description="American Circuits Traveler Management System API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(travelers.router, prefix="/travelers", tags=["travelers"])
app.include_router(work_orders.router, prefix="/work-orders", tags=["work-orders"])
app.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
app.include_router(labor.router, prefix="/labor", tags=["labor"])
app.include_router(barcodes.router, prefix="/barcodes", tags=["barcodes"])
app.include_router(traveler_tracking.router, prefix="/tracking", tags=["traveler-tracking"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(work_centers.router, prefix="/work-centers-mgmt", tags=["work-centers"])

@app.get("/")
async def root():
    return {"message": "NEXUS API - American Circuits Traveler Management System"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "nexus-backend"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)