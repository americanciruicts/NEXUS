#!/usr/bin/env python3
"""Add category column to work_centers table."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

# Default category mappings based on the spreadsheet (Quote vs Actual Tracker)
DEFAULT_CATEGORIES = {
    # PCB Assembly work centers
    'PROGRAM PART': 'SMT hrs. Actual',
    'SMT PROGRAMING': 'SMT hrs. Actual',
    'SMT PROGRAMMING': 'SMT hrs. Actual',
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
    'INTERNAL TESTING': 'E-TEST hrs. Actual',
    'LABELING': 'Labelling, Packaging, Shipping hrs. Actual',
    'HARDWARE': 'Labelling, Packaging, Shipping hrs. Actual',
    'SHIPPING': 'Labelling, Packaging, Shipping hrs. Actual',
    # Cable work centers
    'WIRE CUT': 'HAND hrs. Actual',
    'WIRE CUTT': 'HAND hrs. Actual',
    'STRIP WIRE': 'HAND hrs. Actual',
    'HEAT SHRINK': 'HAND hrs. Actual',
    'TINNING': 'HAND hrs. Actual',
    'CRIMPING': 'HAND hrs. Actual',
    'INSERT': 'HAND hrs. Actual',
    'PULL TEST': 'HAND hrs. Actual',
}


def migrate():
    with engine.connect() as conn:
        # Add category column if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE work_centers ADD COLUMN category VARCHAR(100)"))
            conn.commit()
            print("Added 'category' column to work_centers table")
        except Exception as e:
            if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                print("Column 'category' already exists, skipping")
                conn.rollback()
            else:
                raise

        # Apply default categories
        updated = 0
        for name, category in DEFAULT_CATEGORIES.items():
            result = conn.execute(
                text("UPDATE work_centers SET category = :cat WHERE UPPER(TRIM(name)) = :name AND (category IS NULL OR category = '')"),
                {"cat": category, "name": name.upper().strip()}
            )
            updated += result.rowcount
        conn.commit()
        print(f"Updated {updated} work centers with default categories")

    print("Migration complete!")


if __name__ == "__main__":
    migrate()
