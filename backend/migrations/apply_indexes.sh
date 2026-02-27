#!/bin/bash
# Apply performance indexes to the database
# This script connects to the PostgreSQL database and applies the indexes

echo "Applying performance indexes to NEXUS database..."
echo "================================================"

# Check if psql is available
if command -v psql &> /dev/null; then
    # Direct psql connection
    psql postgresql://nexus_user:postgres@aci-database:5432/nexus -f add_performance_indexes.sql
else
    # Try via Docker
    echo "Using Docker to connect to database..."
    docker exec -i db-consolidation-aci-database-1 psql -U nexus_user -d nexus < add_performance_indexes.sql
fi

echo ""
echo "✅ Database indexes applied successfully!"
echo "Dashboard queries should now be significantly faster."
