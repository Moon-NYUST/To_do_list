import sqlite3
import os

def migrate():
    db_path = 'backend/todolist.db'
    if not os.path.exists(db_path):
        db_path = 'todolist.db' # Try alternative path
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Add status to personaltask
        cursor.execute("ALTER TABLE personaltask ADD COLUMN status VARCHAR DEFAULT 'todo'")
        print("Added status column to personaltask")
    except sqlite3.OperationalError:
        print("Status column already exists in personaltask or table missing")

    try:
        # Add status to teamtask
        cursor.execute("ALTER TABLE teamtask ADD COLUMN status VARCHAR DEFAULT 'todo'")
        print("Added status column to teamtask")
    except sqlite3.OperationalError:
        print("Status column already exists in teamtask or table missing")

    conn.commit()
    conn.close()
    print("Migration complete")

if __name__ == "__main__":
    migrate()
