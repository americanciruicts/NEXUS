import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run migrations and seeds from main.py lifespan
    try:
        from database import engine, SessionLocal
        from models import Base, WorkCenter
        from sqlalchemy import text, inspect as sa_inspect

        Base.metadata.create_all(bind=engine)

        # Auto-migrate: add qty_completed to labor_entries
        with engine.connect() as conn:
            insp = sa_inspect(engine)
            labor_cols = [c['name'] for c in insp.get_columns('labor_entries')]
            if 'qty_completed' not in labor_cols:
                conn.execute(text("ALTER TABLE labor_entries ADD COLUMN qty_completed INTEGER"))
                conn.commit()

        # Only re-seed PCB_ASSEMBLY work centers if FINAL INSPECTION is missing
        db = SessionLocal()
        has_final_inspection = db.query(WorkCenter).filter(
            WorkCenter.traveler_type == 'PCB_ASSEMBLY',
            WorkCenter.name == 'FINAL INSPECTION'
        ).first()
        if has_final_inspection:
            db.close()
            logger.info("Work centers already up to date, skipping seed")
        else:
            deleted = db.query(WorkCenter).filter(WorkCenter.traveler_type == 'PCB_ASSEMBLY').delete()
            db.commit()

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
            logger.info(f"Seeded {len(PCB_ASSY)} PCB_ASSEMBLY work centers")
            db.close()
    except Exception as e:
        logger.warning(f"Startup seed error: {e}")

    yield

app = FastAPI(
    title="NEXUS API",
    description="American Circuits Traveler Management System API",
    version="1.0.0",
    redirect_slashes=False,
    lifespan=lifespan
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://nexus.americancircuits.net,https://aci-nexus.vercel.app,http://localhost:3000,http://localhost:103,http://acidashboard.aci.local:100,https://aci-forge.vercel.app,https://aci-kosh.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
try:
    from routers import travelers, users, work_orders, approvals, labor, auth, barcodes, notifications, search, dashboard, work_centers

    app.include_router(auth.router, prefix="/auth", tags=["authentication"])
    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(travelers.router, prefix="/travelers", tags=["travelers"])
    app.include_router(work_orders.router, prefix="/work-orders", tags=["work-orders"])
    app.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
    app.include_router(labor.router, prefix="/labor", tags=["labor"])
    app.include_router(barcodes.router, prefix="/barcodes", tags=["barcodes"])
    app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
    app.include_router(search.router, prefix="/search", tags=["search"])
    app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
    app.include_router(work_centers.router, prefix="/work-centers-mgmt", tags=["work-centers"])
    logger.info("All routers loaded successfully")
except Exception as e:
    logger.error(f"Failed to import routers: {e}")
    import traceback
    traceback.print_exc()

@app.get("/")
async def root():
    return {"message": "NEXUS API - American Circuits Traveler Management System", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    from sqlalchemy import text
    try:
        from database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "service": "nexus-backend", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "service": "nexus-backend", "database": "disconnected", "error": str(e)}
