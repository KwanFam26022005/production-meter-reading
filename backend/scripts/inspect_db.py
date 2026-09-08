import sqlite3
from backend.app.db import engine, migrate_db

def run():
    migrate_db(engine)

    conn = sqlite3.connect('./data/app.db')
    c = conn.cursor()
    c.execute("UPDATE reading_rounds SET is_legacy = 1 WHERE id = 'be6181e0-83fe-415a-90ec-0aef5fda300e'")
    conn.commit()

    print("=== PRAGMA table_info(meter_readings) ===")
    for row in c.execute("PRAGMA table_info(meter_readings)").fetchall():
        print(row)

    print("\n=== PRAGMA table_info(reading_rounds) ===")
    for row in c.execute("PRAGMA table_info(reading_rounds)").fetchall():
        print(row)

    print("\n=== PRAGMA foreign_key_list(meter_readings) ===")
    for row in c.execute("PRAGMA foreign_key_list(meter_readings)").fetchall():
        print(row)

    print("\n=== PRAGMA index_list(meter_readings) ===")
    for row in c.execute("PRAGMA index_list(meter_readings)").fetchall():
        print(row)
        for i_row in c.execute(f"PRAGMA index_info({row[1]})").fetchall():
            print("   ", i_row)

    print("\n=== SELECT sql FROM sqlite_master WHERE name='meter_readings' ===")
    for row in c.execute("SELECT sql FROM sqlite_master WHERE name='meter_readings'").fetchall():
        print(row[0])

    print("\n=== SELECT sql FROM sqlite_master WHERE name='reading_rounds' ===")
    for row in c.execute("SELECT sql FROM sqlite_master WHERE name='reading_rounds'").fetchall():
        print(row[0])

    print("\n=== PRAGMA foreign_key_check ===")
    print(c.execute("PRAGMA foreign_key_check").fetchall())

    print("\n=== NULL reading_round_id count ===")
    print(c.execute("SELECT COUNT(*) FROM meter_readings WHERE reading_round_id IS NULL").fetchone()[0])

    print("\n=== All reading rounds (id, scheduled_at, status, is_legacy) ===")
    for row in c.execute("SELECT id, scheduled_at, status, is_legacy FROM reading_rounds").fetchall():
        print(row)

    conn.close()

if __name__ == '__main__':
    run()
