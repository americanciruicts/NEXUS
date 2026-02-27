# Database Migrations

This directory contains database migration scripts for NEXUS.

## Performance Indexes

The `add_performance_indexes.sql` script adds indexes to improve dashboard query performance.

### Indexes Added:
- `labor_entries.created_at` - For date range queries
- `travelers.created_at` - For date range queries
- `travelers.status` - For status filtering
- `travelers.completed_at` - For completion time calculations
- `notifications.created_at` - For notification queries
- `notifications.is_read` - For unread notification filtering
- `labor_entries.work_center` - For work center aggregation
- `labor_entries.employee_id` - For employee performance queries
- `traveler_time_entries.end_time` - For active tracking queries
- `labor_entries.is_completed` - For active labor filtering
- `approvals.status` - For pending approval counting
- `travelers.is_active` - For filtering active travelers
- Composite indexes for common query patterns

### How to Apply:

#### Option 1: Using the Bash Script
```bash
cd /home/tony/NEXUS/backend/migrations
./apply_indexes.sh
```

#### Option 2: Using Docker Exec
```bash
cd /home/tony/NEXUS/backend/migrations
docker exec -i db-consolidation-aci-database-1 psql -U nexus_user -d nexus < add_performance_indexes.sql
```

#### Option 3: Direct psql
```bash
cd /home/tony/NEXUS/backend/migrations
psql postgresql://nexus_user:postgres@aci-database:5432/nexus -f add_performance_indexes.sql
```

#### Option 4: Using Python (from backend container)
```bash
cd /home/tony/NEXUS/backend
docker exec nexus_backend python migrations/apply_indexes.py
```

### Verification

After applying indexes, you can verify they were created:
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
ORDER BY tablename, indexname;
```

### Performance Impact

These indexes will significantly improve:
- Dashboard data loading times
- Date range filtering queries
- Status distribution calculations
- Labor hours aggregations
- Employee performance queries
- Work center utilization calculations
