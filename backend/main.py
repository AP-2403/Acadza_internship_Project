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
from .ai_copilot import normalize_speech_math, check_formula_sanity, synthesize_student_explanation, triage_student_doubt

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Automatically load environment variables from .env file if present
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k:
                        os.environ[k] = v
        print(f"Loaded environment variables from {ENV_PATH}")
    except Exception as e:
        print(f"Notice: could not load .env file: {e}")

app = FastAPI(title="Acadza AI Faculty & Student Assessment Platform", version="2.1.0")

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

# Load AI triage results into memory for auto-edit proposals
RESULTS_PATH = BASE_DIR / "results.json"
RESULTS_DATA: List[Dict[str, Any]] = []
if RESULTS_PATH.exists():
    try:
        with open(RESULTS_PATH, "r", encoding="utf-8") as f:
            RESULTS_DATA = json.load(f)
    except Exception:
        pass
RESULTS_BY_QID: Dict[str, Dict[str, Any]] = {r["questionId"]: r for r in RESULTS_DATA if r.get("questionId")}
RESULTS_BY_RID: Dict[str, Dict[str, Any]] = {r["reportId"]: r for r in RESULTS_DATA if r.get("reportId")}

def apply_question_patch(question_id: str, edit: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Applies surgical { field, find, replace } patch to the question:
    - answer: updates answer key for SCQ, MCQ, or Integer question
    - question: updates question stem (e.g. adding missing unit '(in N)', repairing typos)
    - solution: updates derivation or removes stray MathML
    - questionType: corrects question type (e.g. mcq -> scq)
    Persists the updated question to questions.json and in-memory caches.
    """
    global QUESTIONS_DATA, QUESTIONS_MAP
    q = QUESTIONS_MAP.get(question_id)
    if not q:
        return None

    if edit and isinstance(edit, dict):
        field = edit.get("field")
        find_val = edit.get("find")
        replace_val = edit.get("replace")

        q_type = q.get("questionType", "scq")
        target_payload = q.get(q_type)
        if target_payload is None:
            target_payload = {}
            q[q_type] = target_payload

        if field == "questionType":
            q["questionType"] = replace_val
        elif field == "answer":
            if q_type == "mcq":
                if isinstance(replace_val, list):
                    target_payload["answer"] = replace_val
                elif isinstance(replace_val, str) and replace_val.strip().startswith("["):
                    try:
                        import ast
                        target_payload["answer"] = ast.literal_eval(replace_val)
                    except Exception:
                        target_payload["answer"] = [x.strip(" '\"") for x in replace_val.strip("[]").split(",") if x.strip()]
                else:
                    target_payload["answer"] = str(replace_val).strip()
            elif q_type == "integerQuestion":
                target_payload["answer"] = str(replace_val).strip()
            else:
                target_payload["answer"] = str(replace_val).strip()
        elif field == "question":
            current_q = target_payload.get("question", "")
            if find_val and find_val in current_q:
                target_payload["question"] = current_q.replace(find_val, replace_val)
            elif find_val:
                target_payload["question"] = current_q.replace(find_val.strip(), replace_val.strip())
            else:
                target_payload["question"] = current_q + f" {replace_val}"
        elif field == "solution":
            current_s = target_payload.get("solution", "")
            if find_val and find_val in current_s:
                target_payload["solution"] = current_s.replace(find_val, replace_val)
            elif find_val:
                target_payload["solution"] = current_s.replace(find_val.strip(), replace_val.strip())
            else:
                target_payload["solution"] = current_s + f" {replace_val}"

        q["updatedAt"] = datetime.now(timezone.utc).isoformat()

        # Persist to data/questions.json and console/src/data/questions.json
        try:
            with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
                json.dump(QUESTIONS_DATA, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: could not write questions.json: {e}")

        try:
            console_path = BASE_DIR / "console" / "src" / "data" / "questions.json"
            with open(console_path, "w", encoding="utf-8") as f:
                json.dump(QUESTIONS_DATA, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: could not write console questions.json: {e}")

    return q

# Ensure DB is initialized on startup and ensure columns exist
@app.on_event("startup")
def on_startup():
    init_db()
    conn = get_conn()
    cur = conn.cursor()
    # Add faculty_name and resolved_at columns if not present
    try:
        cur.execute("ALTER TABLE reports ADD COLUMN faculty_name TEXT")
    except Exception:
        pass
    try:
        cur.execute("ALTER TABLE reports ADD COLUMN resolved_at TEXT")
    except Exception:
        pass

    # Apply all approved fixes to questions bank so they are permanently reflected everywhere
    try:
        cur.execute("SELECT question_id, edit_json FROM reports WHERE status = 'auto_applied' AND edit_json IS NOT NULL")
        applied_fixes = cur.fetchall()
        for row in applied_fixes:
            qid = row["question_id"]
            if row["edit_json"]:
                try:
                    edit = json.loads(row["edit_json"])
                    apply_question_patch(qid, edit)
                except Exception as e:
                    print("Error applying approved fix on startup:", e)
    except Exception as e:
        print("Startup patch application note:", e)

    # Upgrade any previous un-triaged student doubts with AI Agent proof and surgical diffs
    try:
        cur.execute("SELECT report_id, question_id, comment FROM reports WHERE evidence LIKE 'Direct doubt%' OR edit_json IS NULL")
        un_triaged = cur.fetchall()
        for r in un_triaged:
            qid = r["question_id"]
            q_obj = QUESTIONS_MAP.get(qid)
            if q_obj:
                k_eval = RESULTS_BY_QID.get(qid)
                t_res = triage_student_doubt(q_obj, r["comment"], k_eval)
                edit_j = json.dumps(t_res["edit"]) if t_res.get("edit") else None
                cur.execute("""
                    UPDATE reports
                    SET route = ?, verdict = ?, repair = ?, edit_json = ?, confidence = ?, evidence = ?, student_reply = ?
                    WHERE report_id = ?
                """, (
                    t_res.get("route", "auto_apply"),
                    t_res.get("verdict", "defect"),
                    t_res.get("repair", "answer_key"),
                    edit_j,
                    t_res.get("confidence", 0.98),
                    t_res.get("evidence"),
                    t_res.get("student_reply"),
                    r["report_id"]
                ))
    except Exception as e:
        print("Triage upgrade note:", e)

    conn.commit()
    conn.close()

# --- Request / Response Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class SubmitTestRequest(BaseModel):
    student_username: Optional[str] = "student"
    answers: Dict[str, Any]

class StudentFeedbackRequest(BaseModel):
    questionId: str
    studentId: Optional[str] = "student"
    comment: str
    sessionId: Optional[str] = None

class ProfessorActionRequest(BaseModel):
    reportId: str
    action: str  # 'approve', 'reject', 'mark_reviewed'
    comment: Optional[str] = None

class ApproveFixRequest(BaseModel):
    questionId: str
    reportId: Optional[str] = None
    edit: Optional[Dict[str, Any]] = None
    comment: Optional[str] = None
    facultyName: Optional[str] = "Faculty Lead"

class RejectReportRequest(BaseModel):
    questionId: str
    reportId: Optional[str] = None
    reason: Optional[str] = "Question and answer key verified sound."
    facultyName: Optional[str] = "Faculty Lead"

class ProfessorReplyRequest(BaseModel):
    reportId: str
    replyText: str
    verdict: str  # 'error_verified' (student was correct) or 'concept_clarified' (question is sound)
    facultyName: Optional[str] = "Faculty Lead"
    action: Optional[str] = "reply"

class AIAssistRequest(BaseModel):
    questionId: str
    facultyInput: str
    studentDoubt: Optional[str] = None
    reportId: Optional[str] = None

class UpdateQuestionSolutionRequest(BaseModel):
    questionId: str
    solutionText: str
    answerKey: Optional[str] = None
    questionStem: Optional[str] = None
    facultyName: Optional[str] = "Faculty Lead"
    reportId: Optional[str] = None

# --- Helper to extract question details ---
def extract_question_details(q: Dict[str, Any]):
    q_type = q.get("questionType", "scq")
    data = q.get(q_type, {})
    
    question_text = data.get("question", "")
    solution_text = data.get("solution", "")
    raw_answer = data.get("answer", "")
    
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
    has_key = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "ok",
        "service": "Acadza Assessment & Faculty Triage API",
        "version": "2.1.0",
        "geminiConfigured": has_key,
        "triageEngine": "Google Gemini Flash Agent" if has_key else "Local Physics & Typo Rule Engine"
    }

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
            "solutionText": details["solutionText"],
            "correctAnswer": details["correctAnswer"],
            "quesImages": details["quesImages"],
            "solutionImages": details["solutionImages"],
            "hasSolution": bool(details["solutionText"]),
            details["type"]: q.get(details["type"], {})
        })
    return {"total": len(items), "questions": items}

@app.post("/api/student/submit-test")
def submit_test(req: SubmitTestRequest):
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

        if student_ans is None or str(student_ans).strip() == "":
            status = "unattempted"
            student_ans_str = None
        else:
            attempted += 1
            student_ans_str = str(student_ans).strip()
            c_norm = correct_ans.upper().replace(" ", "").replace(",", "")
            s_norm = student_ans_str.upper().replace(" ", "").replace(",", "")
            
            if s_norm == c_norm:
                status = "correct"
                correct_count += 1
            else:
                status = "wrong"
                incorrect_count += 1

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
            "status": status
        })

    score_percent = round((correct_count / total * 100), 1) if total > 0 else 0.0

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
    if not req.comment or not req.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    q = QUESTIONS_MAP.get(req.questionId)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    subj = q.get("subject", "Physics")
    report_id = f"R_STU_{int(time.time()*1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Pre-triage incoming student doubt through the AI Triage & Subject Specialist Agent
    known_eval = RESULTS_BY_QID.get(req.questionId)
    triage = triage_student_doubt(q, req.comment.strip(), known_eval)

    report_route = triage.get("route", "auto_apply")
    report_verdict = triage.get("verdict", "defect")
    report_repair = triage.get("repair", "answer_key")
    report_edit_json = json.dumps(triage["edit"]) if triage.get("edit") else None
    report_confidence = float(triage.get("confidence", 0.98))
    report_evidence = triage.get("evidence", "Agent verified mathematical derivation.")
    report_reply = triage.get("student_reply", f"Your doubt has been received by the {subj} faculty and is currently being reviewed.")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO reports (
            report_id, question_id, student_id, subject, comment, source,
            status, route, verdict, repair, edit_json, confidence,
            evidence, student_reply, reported_at, session_id, faculty_name, resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id,
        req.questionId,
        req.studentId or "student",
        subj,
        req.comment.strip(),
        "student_test_portal",
        "pending",
        report_route,
        report_verdict,
        report_repair,
        report_edit_json,
        report_confidence,
        report_evidence,
        report_reply,
        now_iso,
        req.sessionId,
        None,
        None
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "reportId": report_id,
        "subject": subj,
        "triage": {
            "route": report_route,
            "verdict": report_verdict,
            "hasAutoFix": report_edit_json is not None,
            "evidence": report_evidence,
            "studentReply": report_reply
        },
        "message": f"Doubt evaluated by AI Triage Agent and routed to {subj} faculty queue!"
    }

@app.get("/api/student/my-doubts")
def get_student_doubts(studentId: Optional[str] = "student"):
    """
    Returns all doubts and faculty responses for the student.
    Includes verification verdict, faculty explanation, and question details.
    """
    conn = get_conn()
    cur = conn.cursor()

    # Fetch reports for this student or web portal doubts
    cur.execute("""
        SELECT * FROM reports 
        WHERE student_id = ? OR source = 'student_test_portal'
        ORDER BY reported_at DESC
    """, (studentId,))
    rows = cur.fetchall()
    conn.close()

    doubts_list = []
    for r in rows:
        qid = r["question_id"]
        q_obj = QUESTIONS_MAP.get(qid)
        q_details = extract_question_details(q_obj) if q_obj else None

        # Determine response status
        is_resolved = r["status"] in ("reviewed", "auto_applied", "dismissed")
        is_corrected = r["status"] == "auto_applied" or r["verdict"] in ("error", "error_verified", "student_correct")
        
        doubts_list.append({
            "reportId": r["report_id"],
            "questionId": qid,
            "subject": r["subject"],
            "studentComment": r["comment"],
            "status": r["status"],
            "verdict": r["verdict"],
            "isResolved": is_resolved,
            "isCorrected": is_corrected,
            "studentReply": r["student_reply"],
            "facultyName": r["faculty_name"] or f"Prof. ({r['subject']} Dept)",
            "reportedAt": r["reported_at"],
            "resolvedAt": r["resolved_at"],
            "questionDetails": {
                "questionText": q_details["questionText"] if q_details else "",
                "chapter": q_details["chapter"] if q_details else "",
                "correctAnswer": q_details["correctAnswer"] if q_details else "",
            } if q_details else None
        })

    return {"count": len(doubts_list), "doubts": doubts_list}

@app.post("/api/professor/reply")
def reply_to_student(req: ProfessorReplyRequest):
    """
    Faculty responds back to the student explaining:
    1. If student was correct: "You were right, correction has been made!"
    2. If student had misconception: "Concept explanation why question is sound."
    """
    conn = get_conn()
    cur = conn.cursor()

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = "auto_applied" if req.verdict == "error_verified" else "reviewed"
    new_route = "auto_apply" if req.verdict == "error_verified" else "no_change"

    # If student is verified correct, automatically patch the question if an edit is found
    if req.verdict == "error_verified":
        cur.execute("SELECT question_id, edit_json FROM reports WHERE report_id = ?", (req.reportId,))
        row = cur.fetchone()
        if row:
            qid = row["question_id"]
            edit = None
            if row["edit_json"]:
                try:
                    edit = json.loads(row["edit_json"])
                except Exception:
                    pass
            if not edit:
                res = RESULTS_BY_QID.get(qid) or RESULTS_BY_RID.get(req.reportId)
                if res and res.get("edit"):
                    edit = res["edit"]
            if edit:
                apply_question_patch(qid, edit)

    cur.execute("""
        UPDATE reports
        SET student_reply = ?,
            verdict = ?,
            status = ?,
            route = ?,
            faculty_name = ?,
            resolved_at = ?
        WHERE report_id = ?
    """, (req.replyText.strip(), req.verdict, new_status, new_route, req.facultyName, now_iso, req.reportId))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "reportId": req.reportId,
        "status": new_status,
        "verdict": req.verdict,
        "studentReply": req.replyText.strip(),
        "message": "Response successfully sent back to student!"
    }

@app.get("/api/professor/reports")
def get_professor_reports(subject: Optional[str] = None):
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
            "facultyName": r["faculty_name"],
            "resolvedAt": r["resolved_at"],
            "questionDetails": q_details
        })

    return {
        "subjectFilter": subject or "All Subjects",
        "count": len(reports_list),
        "reports": reports_list
    }

@app.post("/api/professor/action")
def professor_action(req: ProfessorActionRequest):
    conn = get_conn()
    cur = conn.cursor()

    new_status = "auto_applied" if req.action == "approve" else "dismissed" if req.action == "reject" else "reviewed"
    new_route = "auto_apply" if req.action == "approve" else "no_change" if req.action == "reject" else "faculty_review"
    now_iso = datetime.now(timezone.utc).isoformat()

    # If approving, also trigger question patch if an edit is present
    if req.action == "approve":
        cur.execute("SELECT question_id, edit_json FROM reports WHERE report_id = ?", (req.reportId,))
        row = cur.fetchone()
        if row:
            qid = row["question_id"]
            edit = None
            if row["edit_json"]:
                try:
                    edit = json.loads(row["edit_json"])
                except Exception:
                    pass
            if not edit:
                res = RESULTS_BY_QID.get(qid) or RESULTS_BY_RID.get(req.reportId)
                if res and res.get("edit"):
                    edit = res["edit"]
            if edit:
                apply_question_patch(qid, edit)

    cur.execute("""
        UPDATE reports
        SET status = ?, route = ?, resolved_at = ?
        WHERE report_id = ?
    """, (new_status, new_route, now_iso, req.reportId))

    conn.commit()
    conn.close()

    return {"success": True, "reportId": req.reportId, "newStatus": new_status, "newRoute": new_route}

@app.post("/api/professor/approve-fix")
def approve_fix(req: ApproveFixRequest):
    """
    Faculty reviews and approves a fix for a question:
    - If answer marked as correct is wrong: updates answer key.
    - If unit missing in integer question or stem typo: updates question stem.
    - Persists updated question to question bank and updates report status to auto_applied.
    - Removes report from active review queue.
    """
    edit_to_apply = req.edit
    if not edit_to_apply:
        res = RESULTS_BY_QID.get(req.questionId) or (RESULTS_BY_RID.get(req.reportId) if req.reportId else None)
        if res and res.get("edit"):
            edit_to_apply = res["edit"]

    # 1. Apply surgical patch to question in memory and questions.json
    updated_q = apply_question_patch(req.questionId, edit_to_apply)
    if not updated_q:
        raise HTTPException(status_code=404, detail=f"Question '{req.questionId}' not found in question bank")

    # 2. Update SQLite reports table
    conn = get_conn()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    faculty_display = req.facultyName or "Faculty Lead"
    reply_msg = (
        f"Correction confirmed! {faculty_display} reviewed your feedback and approved the fix. "
        "The question and answer key have been updated in our question bank."
    )
    edit_str = json.dumps(edit_to_apply) if edit_to_apply else None

    cur.execute("""
        UPDATE reports
        SET status = 'auto_applied',
            route = 'auto_apply',
            verdict = 'error_verified',
            faculty_name = ?,
            resolved_at = ?,
            student_reply = ?,
            edit_json = COALESCE(?, edit_json)
        WHERE question_id = ? OR (report_id IS NOT NULL AND report_id = ?)
    """, (faculty_display, now_iso, reply_msg, edit_str, req.questionId, req.reportId or ""))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "questionId": req.questionId,
        "reportId": req.reportId,
        "updatedQuestion": extract_question_details(updated_q),
        "editApplied": edit_to_apply,
        "message": "Question patched and updated! Feedback removed from review queue."
    }

@app.post("/api/professor/reject-report")
def reject_report(req: RejectReportRequest):
    """
    Faculty rejects/dismisses report after confirming the question is sound.
    """
    conn = get_conn()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    faculty_display = req.facultyName or "Faculty Lead"
    reply_msg = (
        f"Thank you for your feedback. {faculty_display} checked the question formulation and official derivation. "
        f"The question is sound and verified correct. Note: {req.reason or 'No defect found.'}"
    )

    cur.execute("""
        UPDATE reports
        SET status = 'dismissed',
            route = 'no_change',
            verdict = 'concept_sound',
            faculty_name = ?,
            resolved_at = ?,
            student_reply = ?
        WHERE question_id = ? OR (report_id IS NOT NULL AND report_id = ?)
    """, (faculty_display, now_iso, reply_msg, req.questionId, req.reportId or ""))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "questionId": req.questionId,
        "reportId": req.reportId,
        "message": "Report dismissed and marked sound."
    }

@app.post("/api/professor/ai-assist")
def ai_assist(req: AIAssistRequest):
    """
    AI Co-Pilot for Faculty:
    1. Analyzes voice or text input containing formulas/derivations.
    2. Validates mathematical equations and consistency.
    3. Triggers smart question-back only if a genuine formula discrepancy is found.
    4. Synthesizes a pedagogical step-by-step reply for the student.
    5. Proposes official solution update for question bank.
    """
    q = QUESTIONS_MAP.get(req.questionId)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    sanity = check_formula_sanity(q, req.facultyInput)
    synthesis = synthesize_student_explanation(q, req.facultyInput, sanity, req.studentDoubt)

    return {
        "success": True,
        "questionId": req.questionId,
        "normalizedSpeech": synthesis["normalizedFacultyInput"],
        "sanity": sanity,
        "studentReply": synthesis["studentReply"],
        "studentIsCorrect": synthesis["studentIsCorrect"],
        "newAnswerKey": synthesis["newAnswerKey"],
        "officialSolutionHtml": synthesis["officialSolutionHtml"]
    }

@app.post("/api/professor/update-question-solution")
def update_question_solution(req: UpdateQuestionSolutionRequest):
    """
    Updates the stored official solution and/or answer key directly in the database,
    making changes in questions.json and updating corresponding student reports.
    """
    global QUESTIONS_DATA, QUESTIONS_MAP
    q = QUESTIONS_MAP.get(req.questionId)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    q_type = q.get("questionType", "scq")
    target_payload = q.get(q_type)
    if target_payload is None:
        target_payload = {}
        q[q_type] = target_payload

    if req.solutionText and req.solutionText.strip():
        target_payload["solution"] = req.solutionText.strip()

    if req.answerKey and req.answerKey.strip():
        target_payload["answer"] = req.answerKey.strip()

    if req.questionStem and req.questionStem.strip():
        target_payload["question"] = req.questionStem.strip()

    q["updatedAt"] = datetime.now(timezone.utc).isoformat()

    try:
        with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
            json.dump(QUESTIONS_DATA, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Warning: could not write questions.json: {e}")

    try:
        console_path = BASE_DIR / "console" / "src" / "data" / "questions.json"
        with open(console_path, "w", encoding="utf-8") as f:
            json.dump(QUESTIONS_DATA, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Warning: could not write console questions.json: {e}")

    # Update SQLite database
    conn = get_conn()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    faculty_display = req.facultyName or "Faculty Lead"
    reply_msg = (
        f"Correction confirmed! {faculty_display} updated the official solution and approach in our question bank. "
        "The derivation has been revised."
    )

    cur.execute("""
        UPDATE reports
        SET status = 'auto_applied',
            route = 'auto_apply',
            verdict = 'error_verified',
            faculty_name = ?,
            resolved_at = ?,
            student_reply = ?
        WHERE question_id = ? OR (report_id IS NOT NULL AND report_id = ?)
    """, (faculty_display, now_iso, reply_msg, req.questionId, req.reportId or ""))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "questionId": req.questionId,
        "updatedQuestion": extract_question_details(q),
        "message": "Question solution and question bank updated successfully in database!"
    }

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
