import sqlite3

def fix_db_v2():
    conn = sqlite3.connect("todolist.db")
    cursor = conn.cursor()
    
    # Check teamtask columns
    cursor.execute("PRAGMA table_info(teamtask)")
    columns = [info[1] for info in cursor.fetchall()]
    print(f"Current teamtask columns: {columns}")

    if "completed_by" not in columns:
        print("Adding completed_by to teamtask...")
        try:
            cursor.execute("ALTER TABLE teamtask ADD COLUMN completed_by VARCHAR DEFAULT NULL")
            print("Success.")
        except Exception as e:
            print(f"Error adding column: {e}")
    else:
        print("teamtask already has completed_by")

    # Check subtask columns
    cursor.execute("PRAGMA table_info(subtask)")
    columns = [info[1] for info in cursor.fetchall()]
    print(f"Current subtask columns: {columns}")
    
    if "completed_by" not in columns:
        print("Adding completed_by to subtask...")
        try:
            cursor.execute("ALTER TABLE subtask ADD COLUMN completed_by VARCHAR DEFAULT NULL")
            print("Success.")
        except Exception as e:
            print(f"Error adding column: {e}")
    else:
        print("subtask already has completed_by")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_db_v2()
