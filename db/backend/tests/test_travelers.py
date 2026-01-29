"""
Unit tests for travelers API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from models import Base
from database import get_db

# Create in-memory test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Create fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


class TestTravelersAPI:
    """Test cases for travelers API endpoints"""

    def test_get_travelers_empty(self):
        """Test getting travelers when database is empty"""
        response = client.get("/travelers/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_traveler_missing_fields(self):
        """Test creating traveler with missing required fields"""
        traveler_data = {
            "job_number": "TEST001",
            # Missing other required fields
        }
        response = client.post("/travelers/", json=traveler_data)
        # Should return 422 for validation error
        assert response.status_code == 422

    def test_create_traveler_success(self):
        """Test successfully creating a traveler"""
        traveler_data = {
            "job_number": "TEST001",
            "work_order_number": "WO001",
            "po_number": "PO001",
            "traveler_type": "ASSY",
            "part_number": "PART001",
            "part_description": "Test Part",
            "revision": "A",
            "quantity": 100,
            "customer_code": "CUST001",
            "customer_name": "Test Customer",
            "priority": "NORMAL",
            "work_center": "ASSEMBLY",
            "status": "CREATED",
            "is_active": True,
            "include_labor_hours": True,
            "process_steps": []
        }
        response = client.post("/travelers/", json=traveler_data)
        assert response.status_code == 200
        data = response.json()
        assert data["job_number"] == "TEST001"
        assert data["part_number"] == "PART001"

    def test_get_traveler_by_id(self):
        """Test getting a specific traveler by ID"""
        # First create a traveler
        traveler_data = {
            "job_number": "TEST002",
            "work_order_number": "WO002",
            "po_number": "PO002",
            "traveler_type": "ASSY",
            "part_number": "PART002",
            "part_description": "Test Part 2",
            "revision": "A",
            "quantity": 50,
            "customer_code": "CUST002",
            "customer_name": "Test Customer 2",
            "priority": "HIGH",
            "work_center": "ASSEMBLY",
            "status": "CREATED",
            "is_active": True,
            "include_labor_hours": False,
            "process_steps": []
        }
        create_response = client.post("/travelers/", json=traveler_data)
        assert create_response.status_code == 200
        traveler_id = create_response.json()["id"]

        # Now get it by ID
        response = client.get(f"/travelers/{traveler_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == traveler_id
        assert data["job_number"] == "TEST002"

    def test_get_nonexistent_traveler(self):
        """Test getting a traveler that doesn't exist"""
        response = client.get("/travelers/99999")
        assert response.status_code == 404

    def test_update_traveler(self):
        """Test updating an existing traveler"""
        # First create a traveler
        traveler_data = {
            "job_number": "TEST003",
            "work_order_number": "WO003",
            "po_number": "PO003",
            "traveler_type": "ASSY",
            "part_number": "PART003",
            "part_description": "Test Part 3",
            "revision": "A",
            "quantity": 75,
            "customer_code": "CUST003",
            "customer_name": "Test Customer 3",
            "priority": "NORMAL",
            "work_center": "ASSEMBLY",
            "status": "CREATED",
            "is_active": True,
            "include_labor_hours": True,
            "process_steps": []
        }
        create_response = client.post("/travelers/", json=traveler_data)
        traveler_id = create_response.json()["id"]

        # Update the traveler
        updated_data = traveler_data.copy()
        updated_data["quantity"] = 100
        updated_data["priority"] = "URGENT"

        response = client.put(f"/travelers/{traveler_id}", json=updated_data)
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 100
        assert data["priority"] == "URGENT"

    def test_delete_traveler(self):
        """Test deleting a traveler"""
        # First create a traveler
        traveler_data = {
            "job_number": "TEST004",
            "work_order_number": "WO004",
            "po_number": "PO004",
            "traveler_type": "ASSY",
            "part_number": "PART004",
            "part_description": "Test Part 4",
            "revision": "A",
            "quantity": 25,
            "customer_code": "CUST004",
            "customer_name": "Test Customer 4",
            "priority": "LOW",
            "work_center": "ASSEMBLY",
            "status": "CREATED",
            "is_active": True,
            "include_labor_hours": False,
            "process_steps": []
        }
        create_response = client.post("/travelers/", json=traveler_data)
        traveler_id = create_response.json()["id"]

        # Delete it
        response = client.delete(f"/travelers/{traveler_id}")
        assert response.status_code == 200

        # Verify it's deleted
        get_response = client.get(f"/travelers/{traveler_id}")
        assert get_response.status_code == 404

    def test_get_latest_revision(self):
        """Test getting latest revision for job number and work order"""
        # Create multiple travelers with same job number and work order
        base_data = {
            "job_number": "REV_TEST",
            "work_order_number": "WO_REV",
            "po_number": "PO_REV",
            "traveler_type": "ASSY",
            "part_number": "PART_REV",
            "part_description": "Revision Test Part",
            "quantity": 100,
            "customer_code": "CUST_REV",
            "customer_name": "Revision Test Customer",
            "priority": "NORMAL",
            "work_center": "ASSEMBLY",
            "status": "CREATED",
            "is_active": True,
            "include_labor_hours": True,
            "process_steps": []
        }

        # Create revision A
        rev_a = base_data.copy()
        rev_a["revision"] = "A"
        client.post("/travelers/", json=rev_a)

        # Create revision B
        rev_b = base_data.copy()
        rev_b["revision"] = "B"
        client.post("/travelers/", json=rev_b)

        # Create revision C (latest)
        rev_c = base_data.copy()
        rev_c["revision"] = "C"
        client.post("/travelers/", json=rev_c)

        # Get latest revision
        response = client.get(
            "/travelers/latest-revision",
            params={"job_number": "REV_TEST", "work_order": "WO_REV"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["revision"] == "C"

    def test_search_travelers(self):
        """Test searching for travelers"""
        # Create test travelers
        travelers = [
            {
                "job_number": "SEARCH001",
                "work_order_number": "WO_S1",
                "po_number": "PO_S1",
                "traveler_type": "ASSY",
                "part_number": "SEARCH_PART1",
                "part_description": "Search Test Part 1",
                "revision": "A",
                "quantity": 50,
                "customer_code": "SEARCH_CUST",
                "customer_name": "Search Customer",
                "priority": "NORMAL",
                "work_center": "ASSEMBLY",
                "status": "CREATED",
                "is_active": True,
                "include_labor_hours": True,
                "process_steps": []
            },
            {
                "job_number": "SEARCH002",
                "work_order_number": "WO_S2",
                "po_number": "PO_S2",
                "traveler_type": "PCB",
                "part_number": "SEARCH_PART2",
                "part_description": "Search Test Part 2",
                "revision": "A",
                "quantity": 75,
                "customer_code": "OTHER_CUST",
                "customer_name": "Other Customer",
                "priority": "HIGH",
                "work_center": "PCB ASSEMBLY",
                "status": "IN_PROGRESS",
                "is_active": True,
                "include_labor_hours": False,
                "process_steps": []
            }
        ]

        for traveler in travelers:
            client.post("/travelers/", json=traveler)

        # Search by customer code
        response = client.get("/travelers/", params={"customer_code": "SEARCH_CUST"})
        assert response.status_code == 200
        results = response.json()
        assert len(results) >= 1
        assert any(t["customer_code"] == "SEARCH_CUST" for t in results)
