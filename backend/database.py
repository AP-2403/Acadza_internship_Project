"""
SQLite database setup and seeding for Acadza Multi-Role Platform.
"""
import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

if os.environ.get("VERCEL"):
    import shutil
    TEMP_DB = Path("/tmp/acadza.db")
    ORIG_DB = BASE_DIR / "backend" / "acadza.db"
    if not TEMP_DB.exists() and ORIG_DB.exists():
        shutil.copy2(ORIG_DB, TEMP_DB)
    DB_PATH = TEMP_DB
else:
    DB_PATH = BASE_DIR / "backend" / "acadza.db"

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()

    # 1. Users table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('student','professor','admin')),
            subject TEXT
        )
    """)

    # 2. Test sessions table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS test_sessions (
            id TEXT PRIMARY KEY,
            student_username TEXT NOT NULL,
            total_questions INTEGER NOT NULL,
            attempted INTEGER NOT NULL,
            correct INTEGER NOT NULL,
            incorrect INTEGER NOT NULL,
            score_percent REAL NOT NULL,
            submitted_at TEXT NOT NULL
        )
    """)

    # 3. Student answers table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS student_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            student_answer TEXT,
            correct_answer TEXT,
            status TEXT NOT NULL CHECK(status IN ('correct','wrong','unattempted')),
            FOREIGN KEY(session_id) REFERENCES test_sessions(id)
        )
    """)

    # 4. Reports / Doubts table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            report_id TEXT PRIMARY KEY,
            question_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            subject TEXT NOT NULL,
            comment TEXT NOT NULL,
            source TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('pending','reviewed','auto_applied','dismissed')),
            route TEXT NOT NULL,
            verdict TEXT,
            repair TEXT,
            edit_json TEXT,
            confidence REAL,
            evidence TEXT,
            student_reply TEXT,
            reported_at TEXT NOT NULL,
            session_id TEXT
        )
    """)

    # Seed users (plain text passwords for demo guest login)
    seed_users = [
        ("student",       "guest123", "Aarav Sharma (JEE Aspirant)", "student",   None),
        ("physics_prof",  "guest123", "Prof. H. C. Verma",           "professor", "Physics"),
        ("zoology_prof",  "guest123", "Prof. R. N. Mukherjee",       "professor", "Zoology"),
        ("botany_prof",   "guest123", "Prof. Sunita Das",            "professor", "Botany"),
        ("admin",         "admin123", "Dean of Academics (Admin)",    "admin",     None),
    ]
    for username, pwd, name, role, subject in seed_users:
        cur.execute(
            """INSERT OR REPLACE INTO users (username, password_hash, name, role, subject)
               VALUES (?, ?, ?, ?, ?)""",
            (username, pwd, name, role, subject),
        )

    # Seed initial 44 reports if empty
    cur.execute("SELECT COUNT(*) FROM reports")
    count = cur.fetchone()[0]
    if count == 0:
        questions_file = DATA_DIR / "questions.json"
        reports_file = DATA_DIR / "reports.json"
        results_file = BASE_DIR / "results.json"

        with open(questions_file, "r", encoding="utf-8") as f:
            questions = json.load(f)
        q_subj_map = {q["_id"]: q.get("subject", "Physics") for q in questions}

        results_map = {}
        if results_file.exists():
            with open(results_file, "r", encoding="utf-8") as f:
                res_data = json.load(f)
                for r in res_data:
                    results_map[r["reportId"]] = r

        with open(reports_file, "r", encoding="utf-8") as f:
            reports = json.load(f)

        for rep in reports:
            rid = rep["reportId"]
            qid = rep["questionId"]
            subj = q_subj_map.get(qid, "Physics")
            triage = results_map.get(rid, {})

            route = triage.get("route", "faculty_review")
            edit = triage.get("edit")
            edit_json = json.dumps(edit) if edit else None

            status = "auto_applied" if route == "auto_apply" else "pending" if route == "faculty_review" else "reviewed"

            cur.execute("""
                INSERT OR REPLACE INTO reports (
                    report_id, question_id, student_id, subject, comment, source,
                    status, route, verdict, repair, edit_json, confidence,
                    evidence, student_reply, reported_at, session_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rid,
                qid,
                rep.get("studentId", "stu_anon"),
                subj,
                rep.get("comment", ""),
                rep.get("source", "seed"),
                status,
                route,
                triage.get("verdict", "error"),
                triage.get("repair"),
                edit_json,
                triage.get("confidence", 0.95),
                triage.get("evidence", "Report matches question defect pattern."),
                triage.get("student_reply", "Thank you for reporting. Faculty has recorded this feedback."),
                rep.get("reportedAt", datetime.utcnow().isoformat() + "Z"),
                None
            ))

    conn.commit()
    conn.close()
    print(f"Database initialized successfully at {DB_PATH}")

if __name__ == "__main__":
    init_db()
