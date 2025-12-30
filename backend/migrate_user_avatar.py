import sqlite3
import os

def migrate():
    db_path = 'backend/todolist.db'
    if not os.path.exists(db_path):
        db_path = 'todolist.db'
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Add avatar to user table
        default_avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky"
        cursor.execute(f"ALTER TABLE user ADD COLUMN avatar VARCHAR DEFAULT '{default_avatar}'")
        print("Added avatar column to user table")
    except sqlite3.OperationalError as e:
        print(f"Migration error or column already exists: {e}")

    conn.commit()
    conn.close()
    print("User migration complete")

if __name__ == "__main__":
    migrate()
