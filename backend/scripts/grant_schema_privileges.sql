-- Grant privileges on public schema to database user
-- Run this script as postgres superuser after creating the database
-- Usage: psql -U postgres -d mukit -f scripts/grant_schema_privileges.sql

-- Replace 'mukit' with your actual database user
GRANT USAGE, CREATE ON SCHEMA public TO mukit;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mukit;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mukit;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO mukit;

