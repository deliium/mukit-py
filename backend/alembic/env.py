import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, text

from alembic import context

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import Base
from app.models import *  # Import all models

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Override sqlalchemy.url from environment variable or .env file
# Priority: DATABASE_URL env var > .env file > alembic.ini
database_url = None

# First, try to get from environment variable
database_url = os.environ.get("DATABASE_URL")

# If not in env var, try to load from .env file via app.core.config
# Make sure .env file is in the backend directory
if not database_url:
    try:
        # Ensure .env file path is correct (backend/.env)
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        env_file = os.path.join(backend_dir, ".env")
        if os.path.exists(env_file):
            # pydantic-settings will automatically look for .env in current directory
            # Change to backend directory temporarily
            original_cwd = os.getcwd()
            try:
                os.chdir(backend_dir)
                from app.core.config import settings
                database_url = settings.DATABASE_URL
            finally:
                os.chdir(original_cwd)
        else:
            # Try loading anyway, in case .env is in a different location
            from app.core.config import settings
            database_url = settings.DATABASE_URL
    except Exception as e:
        # If loading from config fails, fall back to alembic.ini
        print(f"Warning: Could not load DATABASE_URL from .env file: {e}")
        print("Falling back to alembic.ini configuration")

# Convert asyncpg URL to psycopg2 URL for Alembic (synchronous)
# Alembic uses synchronous SQLAlchemy, so it needs psycopg2, not asyncpg
if database_url:
    # Replace postgresql+asyncpg:// with postgresql://
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    # Set it in the config
    config.set_main_option("sqlalchemy.url", database_url)
    print(f"Using DATABASE_URL from environment/.env: {database_url.split('@')[0]}@...")

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    # Get the database URL to extract user and database name
    db_url = config.get_main_option("sqlalchemy.url")
    
    # Parse the URL to get components
    db_name = "mukit"  # default
    db_user = "mukit"  # default
    
    # Try to grant privileges using postgres superuser
    try:
        from urllib.parse import urlparse
        parsed = urlparse(db_url.replace("postgresql://", "postgres://"))
        db_name = parsed.path.lstrip("/") or "mukit"
        db_user = parsed.username or "mukit"
        
        # Try to connect as postgres superuser to grant privileges
        # This will work if postgres user exists and has default password
        postgres_urls = [
            f"postgresql://postgres:postgres@localhost:5432/{db_name}",
            f"postgresql://postgres@localhost:5432/{db_name}",
            f"postgresql://postgres:postgres@{parsed.hostname}:{parsed.port or 5432}/{db_name}",
        ]
        
        granted = False
        for postgres_url in postgres_urls:
            try:
                postgres_engine = engine_from_config(
                    {"sqlalchemy.url": postgres_url},
                    prefix="sqlalchemy.",
                    poolclass=pool.NullPool,
                )
                with postgres_engine.connect() as postgres_conn:
                    postgres_conn.execute(text(f"GRANT USAGE, CREATE ON SCHEMA public TO {db_user}"))
                    postgres_conn.execute(text(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {db_user}"))
                    postgres_conn.execute(text(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {db_user}"))
                    postgres_conn.commit()
                    granted = True
                    break
            except Exception:
                continue
            finally:
                try:
                    postgres_engine.dispose()
                except Exception:
                    pass
        
        if not granted:
            print("Warning: Could not grant schema privileges. Please run as postgres superuser:")
            print(f"  GRANT USAGE, CREATE ON SCHEMA public TO {db_user};")
            print(f"  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {db_user};")
            print(f"  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {db_user};")
    except Exception as e:
        print(f"Warning: Could not parse database URL or grant privileges: {e}")
        print("Please grant schema privileges manually as postgres superuser")

    # Now proceed with migrations using the original connection
    # Check if we have privileges before attempting migrations
    with connectable.connect() as connection:
        try:
            # Try to check if we can use the schema
            connection.execute(text("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'public'"))
            connection.commit()
        except Exception as e:
            if "permission denied" in str(e).lower() or "insufficient privilege" in str(e).lower():
                print("\n" + "="*70)
                print("ERROR: Database user does not have privileges on schema 'public'")
                print("="*70)
                print("\nPlease grant privileges as postgres superuser:")
                print(f"\n  psql -U postgres -d {db_name}")
                print(f"  GRANT USAGE, CREATE ON SCHEMA public TO {db_user};")
                print(f"  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {db_user};")
                print(f"  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {db_user};")
                print("\nOr use the provided script:")
                print(f"  psql -U postgres -d {db_name} -f backend/scripts/grant_schema_privileges.sql")
                print("\n" + "="*70 + "\n")
                raise
            else:
                # Other error, continue anyway
                try:
                    connection.rollback()
                except Exception:
                    pass
        
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
