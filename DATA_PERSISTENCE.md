# Data Persistence Guide for NEXUS

## Overview
This document explains how data is persisted in the NEXUS Traveler Management System.

## Database Persistence

### Docker Volumes
The PostgreSQL database uses a Docker volume named `postgres_data` to persist all data. This means:
- Data survives container restarts (`docker-compose restart`)
- Data survives container rebuilds (`docker-compose up --build`)
- Data is only lost if you explicitly delete volumes with `docker-compose down -v`

### Safe Container Operations

**✅ SAFE - Data Will Persist:**
```bash
docker-compose restart          # Restart all containers
docker-compose restart backend  # Restart specific container
docker-compose stop             # Stop containers
docker-compose start            # Start containers
docker-compose up --build       # Rebuild and start (data persists)
```

**⚠️ CAUTION - May Lose Data:**
```bash
docker-compose down -v          # REMOVES volumes and ALL data
docker volume prune             # Removes unused volumes
docker system prune -a --volumes # Removes all unused resources including volumes
```

**✅ RECOMMENDED:**
```bash
docker-compose down             # Stop and remove containers but KEEP volumes
docker-compose up -d            # Start containers with existing data
```

## Seed Data

### Automatic Seeding
The system includes 3 travelers that are automatically created on backend startup if they don't exist:

1. **Job #8414L** - METSHIFT Assembly
   - Work Order: 23114-3
   - Part: METSHIFT
   - Revision: V0.2
   - Quantity: 250

2. **Job #8744 PART** - MAC PANEL PART
   - Work Order: 23473-3
   - Part: 565210-002 PART
   - Quantity: 19

3. **Job #7946L ASSYL** - DYNACORE ASSY
   - Work Order: 23518-4
   - Part: DYNACORE ASSY
   - Customer: ADD-ON
   - Quantity: 200

### How Seed Data Works
- Seed data runs automatically when the backend starts
- Only creates travelers if they don't already exist (checks by job_number)
- Won't duplicate or overwrite existing travelers
- Located in: `backend/seed_data/seed_travelers.py`

### Customizing Seed Data
To modify the default travelers, edit `backend/seed_data/seed_travelers.py` and restart the backend:
```bash
docker-compose restart backend
```

## Manual Database Backup

### Backup Database
```bash
docker exec nexus_postgres pg_dump -U postgres nexus > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup_20241015.sql | docker exec -i nexus_postgres psql -U postgres nexus
```

## Database Migrations

### Adding New Columns
When adding new columns to models, run:
```bash
# Add column to database
docker exec nexus_postgres psql -U postgres -d nexus -c "ALTER TABLE table_name ADD COLUMN column_name TYPE DEFAULT value;"

# Example:
docker exec nexus_postgres psql -U postgres -d nexus -c "ALTER TABLE travelers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;"
```

### View Current Schema
```bash
docker exec nexus_postgres psql -U postgres -d nexus -c "\d+ travelers"
```

## Troubleshooting

### Check if Data Exists
```bash
docker exec nexus_postgres psql -U postgres -d nexus -c "SELECT COUNT(*) FROM travelers;"
```

### View All Travelers
```bash
docker exec nexus_postgres psql -U postgres -d nexus -c "SELECT job_number, part_number, customer_name FROM travelers;"
```

### Check Volume Status
```bash
docker volume ls | grep postgres_data
docker volume inspect nexus_postgres_data
```

### Recreate Database (⚠️ WILL LOSE ALL DATA)
```bash
docker-compose down -v
docker-compose up -d
```

## Best Practices

1. **Regular Backups**: Create database backups before major changes
2. **Use `docker-compose restart`**: Instead of down/up when possible
3. **Avoid `-v` flag**: Never use `docker-compose down -v` unless you want to delete all data
4. **Test Locally**: Test migrations and changes in development before production
5. **Monitor Logs**: Check backend logs for seed data execution: `docker logs nexus_backend`

## Questions?

For issues or questions, check:
- Backend logs: `docker logs nexus_backend`
- Database logs: `docker logs nexus_postgres`
- System documentation in the project README
