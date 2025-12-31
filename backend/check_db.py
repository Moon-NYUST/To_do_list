import sqlite3

def check_db():
    conn = sqlite3.connect("todolist.db")
    cursor = conn.cursor()
    
    tables = ['personaltask', 'teamtask', 'subtask', 'activitylog']
    for table in tables:
        print(f"--- {table} ---")
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            for col in columns:
                print(col)
        except Exception as e:
            print(f"Error checking {table}: {e}")

    conn.close()

if __name__ == "__main__":
    check_db()
