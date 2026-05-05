import sqlite3
con = sqlite3.connect('realestate.db')
cursor = con.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table';")
for row in cursor.fetchall():
    if row[0]:
        print(row[0])
        print('---')
