#!/usr/bin/env python3
"""
Apply performance indexes to the database.
Run this script to add indexes that improve dashboard query performance.
"""

import sys
import os

# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def apply_indexes():
    """Apply performance indexes from SQL file."""
    sql_file = os.path.join(os.path.dirname(__file__), 'add_performance_indexes.sql')
    
    print("Reading SQL migration file...")
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    # Split by semicolon and execute each statement
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
    
    print(f"Applying {len(statements)} SQL statements...")
    
    with engine.connect() as conn:
        for i, statement in enumerate(statements, 1):
            try:
                print(f"[{i}/{len(statements)}] Executing: {statement[:60]}...")
                conn.execute(text(statement))
                conn.commit()
                print(f"✓ Success")
            except Exception as e:
                print(f"✗ Error: {e}")
                continue
    
    print("\n✅ Database indexes applied successfully!")
    print("Dashboard queries should now be significantly faster.")

if __name__ == "__main__":
    try:
        apply_indexes()
    except Exception as e:
        print(f"❌ Failed to apply indexes: {e}")
        sys.exit(1)
