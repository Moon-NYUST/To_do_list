import sqlite3

def force_fix():
    conn = sqlite3.connect("todolist.db")
    cursor = conn.cursor()
    
    print("Attempting to add completed_by to teamtask...")
    try:
        cursor.execute("ALTER TABLE teamtask ADD COLUMN completed_by VARCHAR DEFAULT NULL")
        print("Success: Added completed_by to teamtask")
    except sqlite3.OperationalError as e:
        print(f"Info: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    force_fix()
