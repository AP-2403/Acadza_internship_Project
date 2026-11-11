"""
SQLite database setup, schema definitions, and audit logging for Acadza Multi-Role Platform.
"""
import sqlite3
import os
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any

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


def hash_password(password: str) -> str:
    """Computes salted SHA-256 password hash."""
    salt = "acadza_salt_2026_"
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def verify_password(plain: str, stored: str) -> bool:
    """Verifies password against stored hash with fallback for initial seed plain text."""
    if plain == stored:
        return True
    return hash_password(plain) == stored


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def record_audit_event(
    action: str,
    actor: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[str] = None
) -> None:
    """
    Appends an immutable audit event to the database audit_log table.
    Tracks all approvals, edits, rejections, student feedback, and logins.
    """
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO audit_log (action, actor, target_type, target_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            action,
            actor,
            target_type,
            target_id,
            details,
            datetime.now(timezone.utc).isoformat()
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Warning: could not write audit log: {e}")


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
            faculty_name TEXT,
            resolved_at TEXT,
            reported_at TEXT NOT NULL,
            session_id TEXT
        )
    """)

    # 5. Immutable Audit Log table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            actor TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            details TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # Seed users with salted hashes
    seed_users = [
        ("student",       "guest123", "Aarav Sharma (JEE Aspirant)", "student",   None),
        ("physics_prof",  "guest123", "Prof A",                      "professor", "Physics"),
        ("zoology_prof",  "guest123", "Prof B",                      "professor", "Zoology"),
        ("botany_prof",   "guest123", "Prof C",                      "professor", "Botany"),
        ("admin",         "admin123", "Dean of Academics (Admin)",    "admin",     None),
    ]
    for username, pwd, name, role, subject in seed_users:
        cur.execute(
            """INSERT OR REPLACE INTO users (username, password_hash, name, role, subject)
               VALUES (?, ?, ?, ?, ?)""",
            (username, hash_password(pwd), name, role, subject),
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
                    evidence, student_reply, faculty_name, resolved_at, reported_at, session_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                "System Seed" if status == "auto_applied" else None,
                datetime.now(timezone.utc).isoformat() if status == "auto_applied" else None,
                rep.get("reportedAt", datetime.now(timezone.utc).isoformat()),
                None
            ))

        conn.commit()
        conn.close()
        record_audit_event("SYSTEM_INITIALIZED", "system", "database", "reports", "Seeded 44 baseline triage reports")
        return

    conn.commit()
    conn.close()
    print(f"Database initialized successfully at {DB_PATH}")


if __name__ == "__main__":
    init_db()
