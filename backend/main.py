import os
import json
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone

from .database import get_conn, init_db
from .auth import create_token, store_session, get_current_user, remove_session

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

app = FastAPI(title="Acadza AI Faculty & Student Assessment Platform", version="2.0.0")

# Enable CORS for local dev and preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load questions into memory for fast lookup
QUESTIONS_PATH = DATA_DIR / "questions.json"
with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
    QUESTIONS_DATA: List[Dict[str, Any]] = json.load(f)
QUESTIONS_MAP: Dict[str, Dict[str, Any]] = {q["_id"]: q for q in QUESTIONS_DATA}

# Ensure DB is initialized on startup
@app.on_event("startup")
def on_startup():
    init_db()

# --- Request / Response Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class SubmitTestRequest(BaseModel):
    student_username: Optional[str] = "student"
    answers: Dict[str, Any]  # { question_id: "A" or 4800 or ["A","B"] }

class StudentFeedbackRequest(BaseModel):
    questionId: str
    studentId: Optional[str] = "student"
    comment: str
    sessionId: Optional[str] = None

class ProfessorActionRequest(BaseModel):
    reportId: str
    action: str  # 'approve', 'reject', 'mark_reviewed'
    comment: Optional[str] = None

# --- Helper to extract correct answer & text ---
def extract_question_details(q: Dict[str, Any]):
    q_type = q.get("questionType", "scq")
    data = q.get(q_type, {})
    
    question_text = data.get("question", "")
    solution_text = data.get("solution", "")
    raw_answer = data.get("answer", "")
    
    # Normalize correct answer string representation
    if isinstance(raw_answer, list):
        correct_str = ", ".join(str(x).strip(" '\"") for x in raw_answer if x)
    else:
        correct_str = str(raw_answer).strip()
        
    return {
        "questionText": question_text,
        "solutionText": solution_text,
        "correctAnswer": correct_str,
        "quesImages": data.get("quesImages", []),
        "solutionImages": data.get("solutionImages", []),
        "type": q_type,
        "subject": q.get("subject", "Physics"),
        "chapter": q.get("chapter", "General"),
        "level": q.get("level", "MEDIUM")
    }

# --- Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Acadza Assessment & Faculty Triage API"}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT username, name, role, subject, password_hash FROM users WHERE username = ?",
        (req.username.strip(),)
    )
    user_row = cur.fetchone()
    conn.close()

    if not user_row or user_row["password_hash"] != req.password.strip():
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_dict = {
        "username": user_row["username"],
        "name": user_row["name"],
        "role": user_row["role"],
        "subject": user_row["subject"]
    }
    token = create_token(user_row["username"])
    store_session(token, user_dict)

    return {
        "success": True,
        "token": token,
        "user": user_dict
    }

@app.get("/api/auth/me")
def get_me(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "").strip()
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return {"user": user}

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        remove_session(token)
    return {"success": True}

@app.get("/api/questions")
def get_questions(subject: Optional[str] = None):
    """
    Returns questions. Can be filtered by subject (Physics, Zoology, Botany).
    """
    items = []
    for q in QUESTIONS_DATA:
        q_subj = q.get("subject", "Physics")
        if subject and q_subj.lower() != subject.lower():
            continue
        details = extract_question_details(q)
        items.append({
            "_id": q["_id"],
            "subject": details["subject"],
            "chapter": details["chapter"],
            "level": details["level"],
            "questionType": details["type"],
            "questionText": details["questionText"],
            "quesImages": details["quesImages"],
            # Answer omitted in clean question paper view, or included if needed:
            "hasSolution": bool(details["solutionText"])
        })
    return {"total": len(items), "questions": items}

@app.post("/api/student/submit-test")
def submit_test(req: SubmitTestRequest):
    """
    Evaluates student's answers against ground-truth keys.
    Computes Green (correct), Red (wrong), Grey (unattempted).
    Stores test session and answer records in SQLite.
    """
    answers = req.answers or {}
    total = len(QUESTIONS_DATA)
    attempted = 0
    correct_count = 0
    incorrect_count = 0
    
    session_id = f"sess_{int(time.time()*1000)}"
    results = []

    conn = get_conn()
    cur = conn.cursor()

    for q in QUESTIONS_DATA:
        qid = q["_id"]
        details = extract_question_details(q)
        correct_ans = details["correctAnswer"]
        student_ans = answers.get(qid)

        # Normalize comparison
        if student_ans is None or str(student_ans).strip() == "":
            status = "unattempted"
            student_ans_str = None
        else:
            attempted += 1
            student_ans_str = str(student_ans).strip()
            # Normalize for MCQ / case insensitive comparison
            c_norm = correct_ans.upper().replace(" ", "").replace(",", "")
            s_norm = student_ans_str.upper().replace(" ", "").replace(",", "")
            
            if s_norm == c_norm:
                status = "correct"
                correct_count += 1
            else:
                status = "wrong"
                incorrect_count += 1

        # Save to student_answers
        cur.execute("""
            INSERT INTO student_answers (session_id, question_id, student_answer, correct_answer, status)
            VALUES (?, ?, ?, ?, ?)
        """, (session_id, qid, student_ans_str, correct_ans, status))

        results.append({
            "questionId": qid,
            "subject": details["subject"],
            "chapter": details["chapter"],
            "questionType": details["type"],
            "questionText": details["questionText"],
            "quesImages": details["quesImages"],
            "solutionText": details["solutionText"],
            "solutionImages": details["solutionImages"],
            "correctAnswer": correct_ans,
            "studentAnswer": student_ans_str,
            "status": status  # 'correct' (green), 'wrong' (red), 'unattempted' (grey)
        })

    score_percent = round((correct_count / total * 100), 1) if total > 0 else 0.0

    # Save to test_sessions
    cur.execute("""
        INSERT INTO test_sessions (
            id, student_username, total_questions, attempted, correct, incorrect, score_percent, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        req.student_username or "student",
        total,
        attempted,
        correct_count,
        incorrect_count,
        score_percent,
        datetime.now(timezone.utc).isoformat()
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "sessionId": session_id,
        "stats": {
            "total": total,
            "attempted": attempted,
            "correct": correct_count,
            "incorrect": incorrect_count,
            "scorePercent": score_percent,
        },
        "results": results
    }

@app.post("/api/student/submit-feedback")
def submit_feedback(req: StudentFeedbackRequest):
    """
    Captures per-question doubt/feedback from student.
    Persists as a new report in the database, automatically categorized by the question's subject.
    """
    if not req.comment or not req.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    q = QUESTIONS_MAP.get(req.questionId)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    subj = q.get("subject", "Physics")
    report_id = f"R_STU_{int(time.time()*1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO reports (
            report_id, question_id, student_id, subject, comment, source,
            status, route, verdict, repair, edit_json, confidence,
            evidence, student_reply, reported_at, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id,
        req.questionId,
        req.studentId or "student_web",
        subj,
        req.comment.strip(),
        "student_test_portal",
        "pending",
        "faculty_review",
        "reported_doubt",
        "question_inquiry",
        None,
        0.85,
        "Direct doubt submitted during test review.",
        "Thank you for reporting this doubt. The subject faculty has received it and is reviewing the question.",
        now_iso,
        req.sessionId
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "reportId": report_id,
        "subject": subj,
        "message": f"Doubt successfully routed to {subj} faculty queue!"
    }

@app.get("/api/professor/reports")
def get_professor_reports(subject: Optional[str] = None):
    """
    Returns doubts/reports filtered strictly by subject expertise.
    If subject == 'Physics', only Physics reports are fetched.
    If subject is omitted or None (e.g. Admin), all reports are returned.
    """
    conn = get_conn()
    cur = conn.cursor()

    if subject and subject.strip() and subject.lower() != "all":
        cur.execute("""
            SELECT * FROM reports WHERE LOWER(subject) = LOWER(?) ORDER BY reported_at DESC
        """, (subject.strip(),))
    else:
        cur.execute("SELECT * FROM reports ORDER BY reported_at DESC")

    rows = cur.fetchall()
    conn.close()

    reports_list = []
    for r in rows:
        qid = r["question_id"]
        q_obj = QUESTIONS_MAP.get(qid)
        q_details = extract_question_details(q_obj) if q_obj else None

        reports_list.append({
            "reportId": r["report_id"],
            "questionId": qid,
            "studentId": r["student_id"],
            "subject": r["subject"],
            "comment": r["comment"],
            "source": r["source"],
            "status": r["status"],
            "route": r["route"],
            "verdict": r["verdict"],
            "repair": r["repair"],
            "edit": json.loads(r["edit_json"]) if r["edit_json"] else None,
            "confidence": r["confidence"],
            "evidence": r["evidence"],
            "student_reply": r["student_reply"],
            "reportedAt": r["reported_at"],
            "sessionId": r["session_id"],
            "questionDetails": q_details
        })

    return {
        "subjectFilter": subject or "All Subjects",
        "count": len(reports_list),
        "reports": reports_list
    }

@app.post("/api/professor/action")
def professor_action(req: ProfessorActionRequest):
    """
    Faculty action on a reported doubt: approve, reject, or mark reviewed.
    """
    conn = get_conn()
    cur = conn.cursor()

    new_status = "auto_applied" if req.action == "approve" else "dismissed" if req.action == "reject" else "reviewed"
    new_route = "auto_apply" if req.action == "approve" else "no_change" if req.action == "reject" else "faculty_review"

    cur.execute("""
        UPDATE reports
        SET status = ?, route = ?
        WHERE report_id = ?
    """, (new_status, new_route, req.reportId))

    conn.commit()
    conn.close()

    return {"success": True, "reportId": req.reportId, "newStatus": new_status, "newRoute": new_route}

@app.get("/api/professor/stats")
def get_professor_stats(subject: Optional[str] = None):
    conn = get_conn()
    cur = conn.cursor()

    if subject and subject.strip() and subject.lower() != "all":
        cur.execute("""
            SELECT status, count(*) FROM reports WHERE LOWER(subject) = LOWER(?) GROUP BY status
        """, (subject.strip(),))
    else:
        cur.execute("SELECT status, count(*) FROM reports GROUP BY status")

    counts = dict(cur.fetchall())
    conn.close()

    return {
        "pending": counts.get("pending", 0),
        "reviewed": counts.get("reviewed", 0),
        "auto_applied": counts.get("auto_applied", 0),
        "dismissed": counts.get("dismissed", 0),
        "total": sum(counts.values())
    }
