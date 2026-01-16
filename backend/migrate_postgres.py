import os
import psycopg2
from urllib.parse import urlparse

def migrate():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL not set.")
        return

    # Handle postgres:// vs postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    print(f"Connecting to database for migration...")
    
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cur = conn.cursor()

        # 1. Update Attendance table
        print("Checking 'attendance' table...")
        columns_to_add = {
            "planned_hours": "FLOAT DEFAULT 0.0",
            "task_ids": "TEXT",
            "initial_task_titles": "TEXT",
            "status": "TEXT DEFAULT 'working'",
            "report_summary": "TEXT",
            "completed_tasks": "TEXT"
        }
        
        for col, col_type in columns_to_add.items():
            cur.execute(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='attendance' AND column_name='{col}') THEN
                        ALTER TABLE attendance ADD COLUMN {col} {col_type};
                        RAISE NOTICE 'Added column {col} to attendance';
                    END IF;
                END $$;
            """)

        # 2. Update PersonalTask and TeamTask for 'status' column if missing
        for table in ['personaltask', 'teamtask']:
            print(f"Checking '{table}' table...")
            cur.execute(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='{table}' AND column_name='status') THEN
                        ALTER TABLE {table} ADD COLUMN status TEXT DEFAULT 'todo';
                    END IF;
                END $$;
            """)

        # 3. Add ActivityLog table if it hasn't been created by SQLModel yet
        # (Though create_all should handle new tables, this ensures consistency)
        print("Migration check completed.")
        
        cur.close()
        conn.close()
        print("Successfully updated database schema.")

    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
