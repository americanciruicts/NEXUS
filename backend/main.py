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
                    ("GENERATE CAD", "Generate CAD files for manufacturing"),
                    ("VERIFY BOM", "Verify no BOM or rev changes"),
                    ("GENERATE GERBER", "Generate Gerber files for PCB fabrication"),
                    ("VERIFY GERBER", "Verify Gerber files are correct"),
                    ("MAKE SILKSCREEN", "Create silkscreen artwork for PCB"),
                    ("PROGRAM AOI", "Program Automated Optical Inspection machine"),
                    ("SMT PROGRAMING", "Program SMT placement machine"),
                    ("KITTING", "Pull parts from inventory to place in a kit for manufacturing"),
                    ("COMPONENT PREP", "Pre-bending of parts or any necessary alteration of a part prior to production"),
                    ("PROGRAM PART", "Parts that need to be programmed prior to SMT"),
                    ("HAND SOLDER", "Anything that must be soldered by hand, no wave, no SMT"),
                    ("SMT PROGRAMMING", "Programming the SMT placement machine"),
                    ("GLUE", "Gluing done at SMT after paste to make sure parts stay on"),
                    ("SMT TOP", "SMT top placed"),
                    ("SMT BOTTOM", "SMT bottom placed"),
                    ("WASH", "Process of cleaning a dirty PCB"),
                    ("X-RAY", "Visual continuity check of components as requested by customer"),
                    ("MANUAL INSERTION", "Install prepared parts before wave"),
                    ("WAVE", "Wave soldering process"),
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
                    ("SEND TO ESS", "Operator to sign and ship to ESS"),
                    ("RETURN FROM ESS", "Operator to sign when received from ESS"),
                    ("VISUAL INSPECTION", "Human visual inspection parts and coating, no AOI"),
                    ("FINAL INSPECTION", "Quality Control inspection before shipping"),
                    ("MANUAL ASSEMBLY", "Put the assembly together by hand"),
                    ("BOX ASSEMBLY", "Mechanical build consisting of the PCBA, hardware, and/or housings"),
                    ("HARDWARE", "Adding screws, nuts, bolts, brackets, displays, etc."),
                    ("SHIPPING", "Send product to customer per packing request"),
                ],
                "PCB": [
                    ("ENGINEERING", "Reverse engineering and design"),
                    ("GENERATE CAD", "Generate CAD files for manufacturing"),
                    ("VERIFY BOM", "Verify no BOM or rev changes"),
                    ("GENERATE GERBER", "Generate Gerber files for PCB fabrication"),
                    ("VERIFY GERBER", "Verify Gerber files are correct"),
                    ("MAKE SILKSCREEN", "Create silkscreen artwork for PCB"),
                    ("PROGRAM AOI", "Program Automated Optical Inspection machine"),
                    ("SMT PROGRAMING", "Program SMT placement machine"),
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
                    ("MANUAL INSERTION", "Install prepared parts before wave"),
                    ("VSCORE", "Use a machine to break a panel into individual boards"),
                    ("PRODUCT PICTURES", "Take pictures of product before shipping"),
                    ("LABELING", "Place a label on the board per BOM instructions"),
                    ("FINAL INSPECTION", "Sample inspection of the PCB artwork by Quality Control"),
                    ("SHIPPING", "Send product to customer per packing request"),
                ],
                "CABLE": [
                    ("ENGINEERING", "Reverse engineering and design"),
                    ("GENERATE CAD", "Generate CAD files for manufacturing"),
                    ("VERIFY BOM", "Verify no BOM or rev changes"),
                    ("GENERATE GERBER", "Generate Gerber files for fabrication"),
                    ("VERIFY GERBER", "Verify Gerber files are correct"),
                    ("MAKE SILKSCREEN", "Create silkscreen artwork"),
                    ("PROGRAM AOI", "Program Automated Optical Inspection machine"),
                    ("SMT PROGRAMING", "Program SMT placement machine"),
                    ("WIRE CUT", "Cut wire to length needed"),
                    ("STRIP WIRE", "Remove insulation to necessary length"),
                    ("HEAT SHRINK", "Cut and shrink (heat shrink or flex loom)"),
                    ("TINNING", "Dip wire end into solder"),
                    ("CRIMPING", "Fold into ridges by pinching together"),
                    ("INSERT", "Install pins into connector"),
                    ("PULL TEST", "Make sure crimps don't fall off"),
                    ("MANUAL INSERTION", "Install prepared parts"),
                    ("PRODUCT PICTURES", "Take pictures of product before shipping"),
                    ("LABELING", "Place a label per instructions"),
                    ("FINAL INSPECTION", "Quality Control inspection before shipping"),
                    ("SHIPPING", "Send product to customer per packing request"),
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