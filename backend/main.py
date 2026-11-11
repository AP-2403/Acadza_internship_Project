import os
import json
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone

from .database import get_conn, init_db, record_audit_event, verify_password, hash_password
from .auth import create_token, store_session, get_current_user, remove_session, require_faculty_or_admin
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

# Enable CORS for authorized web clients and preview deployments
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:[0-9]+)?",
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://acadza-liart.vercel.app",
        "https://acadza.vercel.app",
    ],
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
RESULTS_BY_RID: Dict[str, Dict[str, Any]] = {r["reportId"]: r for r in RESULTS_DATA if r.get("reportId")}
RESULTS_LIST_BY_QID: Dict[str, List[Dict[str, Any]]] = {}
for r in RESULTS_DATA:
    qid = r.get("questionId")
    if qid:
        RESULTS_LIST_BY_QID.setdefault(qid, []).append(r)

RESULTS_BY_QID: Dict[str, Dict[str, Any]] = {}
for qid, res_list in RESULTS_LIST_BY_QID.items():
    with_edit = [r for r in res_list if r.get("edit")]
    RESULTS_BY_QID[qid] = with_edit[0] if with_edit else res_list[0]

def apply_question_patch(
    question_id: str,
    edit: Optional[Dict[str, Any]],
    actor: Optional[str] = "faculty",
    repair_type: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Applies surgical { field, find, replace } patch to the question:
    - answer: updates answer key for SCQ, MCQ, or Integer question (verifies find precondition)
    - question: updates question stem (requires find to match exactly once)
    - solution: updates derivation or removes stray MathML (requires find to match exactly once)
    - questionType: corrects question type (e.g. mcq -> scq), cleanly migrating payload
    Strictly idempotent: returns question on repeat calls, and returns None (failing cleanly) if find precondition fails.
    Appends audit record to question's errorHistory.
    """
    global QUESTIONS_DATA, QUESTIONS_MAP
    q = QUESTIONS_MAP.get(question_id)
    if not q:
        return None

    if not edit or not isinstance(edit, dict):
        return q

    field = edit.get("field")
    find_val = edit.get("find")
    replace_val = edit.get("replace")

    q_type = q.get("questionType", "scq")
    target_payload = q.get(q_type)
    if target_payload is None:
        target_payload = {}
        q[q_type] = target_payload

    if field == "questionType":
        old_type = q.get("questionType", "mcq")
        new_type = str(replace_val).strip()
        if old_type == new_type:
            return q
        if find_val and old_type != str(find_val).strip():
            return None

        if old_type in q and old_type != new_type:
            payload = q.pop(old_type)
            if new_type == "scq" and isinstance(payload.get("answer"), list):
                ans_list = [x for x in payload["answer"] if x]
                payload["answer"] = ans_list[0] if ans_list else "B"
            q[new_type] = payload
        elif new_type not in q:
            q[new_type] = target_payload
        q["questionType"] = new_type

    elif field == "answer":
        cur_ans = target_payload.get("answer")
        if q_type == "mcq":
            target_list = replace_val if isinstance(replace_val, list) else [str(replace_val).strip()]
            if cur_ans == target_list:
                return q
            if find_val is not None:
                expected_find = find_val if isinstance(find_val, list) else [str(find_val).strip()]
                if cur_ans != expected_find:
                    return None
            target_payload["answer"] = target_list
        else:
            target_str = str(replace_val).strip()
            if str(cur_ans).strip() == target_str:
                return q
            if find_val is not None and str(cur_ans).strip() != str(find_val).strip():
                return None
            target_payload["answer"] = target_str

    elif field == "question":
        current_q = target_payload.get("question", "")
        if find_val is None:
            return None
        find_str = str(find_val)
        repl_str = str(replace_val)
        if repl_str in current_q:
            return q

        cnt = current_q.count(find_str)
        if cnt == 1:
            target_payload["question"] = current_q.replace(find_str, repl_str)
        elif cnt == 0 and current_q.count(find_str.strip()) == 1:
            target_payload["question"] = current_q.replace(find_str.strip(), repl_str.strip())
        else:
            # 0 occurrences or ambiguous (>1 occurrences)
            return None

    elif field == "solution":
        current_s = target_payload.get("solution", "")
        if find_val is None:
            return None
        find_str = str(find_val)
        repl_str = str(replace_val)
        if repl_str in current_s:
            return q

        cnt = current_s.count(find_str)
        if cnt == 1:
            target_payload["solution"] = current_s.replace(find_str, repl_str)
        elif cnt == 0 and current_s.count(find_str.strip()) == 1:
            target_payload["solution"] = current_s.replace(find_str.strip(), repl_str.strip())
        else:
            return None

    # Append to immutable errorHistory
    hist = q.setdefault("errorHistory", [])
    note_str = f"'{find_val}' -> '{replace_val}'" if find_val is not None else f"Set {field} to {replace_val}"
    hist.append({
        "type": repair_type or f"Patch {field}",
        "actor": actor or "faculty",
        "at": datetime.now(timezone.utc).isoformat(),
        "note": note_str
    })

    q["updatedAt"] = datetime.now(timezone.utc).isoformat()

    # Persist safely, handling Vercel read-only filesystem gracefully
    try:
        with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
            json.dump(QUESTIONS_DATA, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Notice: question bank disk persist (read-only filesystem or Vercel): {e}")

    try:
        console_path = BASE_DIR / "console" / "src" / "data" / "questions.json"
        if console_path.exists():
            with open(console_path, "w", encoding="utf-8") as f:
                json.dump(QUESTIONS_DATA, f, indent=2, ensure_ascii=False)
    except Exception as e:
        pass

    return q

    return q

# Ensure DB is initialized on startup cleanly without mutating question files or re-triaging
@app.on_event("startup")
def on_startup():
    init_db()

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

    if not user_row or not verify_password(req.password.strip(), user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_dict = {
        "username": user_row["username"],
        "name": user_row["name"],
        "role": user_row["role"],
        "subject": user_row["subject"]
    }
    token = create_token(user_row["username"])
    store_session(token, user_dict)

    record_audit_event("USER_LOGIN", user_row["username"], "user", user_row["username"], f"Signed in as {user_row['role']}")

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
def get_questions(
    subject: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    token = authorization.replace("Bearer ", "").strip() if authorization else None
    user = get_current_user(token) if token else None
    is_privileged = user is not None and user.get("role") in ("professor", "admin")

    items = []
    for q in QUESTIONS_DATA:
        q_subj = q.get("subject", "Physics")
        if subject and q_subj.lower() != subject.lower():
            continue
        details = extract_question_details(q)
        q_type = details["type"]
        raw_type_payload = q.get(q_type, {})

        if is_privileged:
            # Privileged view: full solutions and answer keys for faculty triage
            items.append({
                "_id": q["_id"],
                "subject": details["subject"],
                "chapter": details["chapter"],
                "level": details["level"],
                "questionType": q_type,
                "questionText": details["questionText"],
                "solutionText": details["solutionText"],
                "correctAnswer": details["correctAnswer"],
                "quesImages": details["quesImages"],
                "solutionImages": details["solutionImages"],
                "hasSolution": bool(details["solutionText"]),
                q_type: raw_type_payload
            })
        else:
            # Student exam view: strip answers, solutions, and internal keys before test submission
            safe_payload = {
                "question": raw_type_payload.get("question", details["questionText"]),
                "quesImages": raw_type_payload.get("quesImages", details["quesImages"]),
            }
            items.append({
                "_id": q["_id"],
                "subject": details["subject"],
                "chapter": details["chapter"],
                "level": details["level"],
                "questionType": q_type,
                "questionText": details["questionText"],
                "quesImages": details["quesImages"],
                "hasSolution": False,
                q_type: safe_payload
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
    if len(req.comment) > 2000:
        raise HTTPException(status_code=400, detail="Comment exceeds maximum limit of 2000 characters")

    q = QUESTIONS_MAP.get(req.questionId)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    subj = q.get("subject", "Physics")
    report_id = f"R_STU_{int(time.time()*1000)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Pre-triage incoming student doubt through the AI Triage & Subject Specialist Agent
    known_eval = RESULTS_BY_QID.get(req.questionId)
    triage = triage_student_doubt(q, req.comment.strip(), known_eval)

    report_route = triage.get("route", "faculty_review")
    report_verdict = triage.get("verdict", "defect")
    report_repair = triage.get("repair", "answer_key")
    report_edit_json = json.dumps(triage["edit"]) if triage.get("edit") else None
    report_confidence = float(triage.get("confidence", 0.90))
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
def get_student_doubts(
    studentId: Optional[str] = "student",
    authorization: Optional[str] = Header(None)
):
    """
    Returns all doubts and faculty responses for the authenticated student.
    Includes verification verdict, faculty explanation, and question details.
    """
    token = extract_token(authorization)
    auth_user = get_current_user(token) if token else None
    effective_student = auth_user["username"] if auth_user and auth_user.get("role") == "student" else (studentId or "student")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM reports 
        WHERE student_id = ?
        ORDER BY reported_at DESC
    """, (effective_student,))
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
def reply_to_student(req: ProfessorReplyRequest, auth_user: dict = Depends(require_faculty_or_admin)):
    """
    Faculty responds back to the student explaining:
    1. If student was correct: "You were right, correction has been made!"
    2. If student had misconception: "Concept explanation why question is sound."
    """
    conn = get_conn()
    cur = conn.cursor()

    # Subject access control
    cur.execute("SELECT question_id, subject, edit_json FROM reports WHERE report_id = ?", (req.reportId,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Report '{req.reportId}' not found")

    rep_subject = row["subject"]
    user_subject = auth_user.get("subject")
    if auth_user.get("role") == "professor" and user_subject and user_subject.lower() != rep_subject.lower():
        conn.close()
        raise HTTPException(status_code=403, detail=f"Forbidden: You are assigned to {user_subject}, cannot modify {rep_subject} report")

    now_iso = datetime.now(timezone.utc).isoformat()
    is_defect = req.verdict in ("error_verified", "defect")
    new_verdict = "defect" if is_defect else "no_error"
    new_status = "auto_applied" if is_defect else "reviewed"
    new_route = "auto_apply" if is_defect else "no_change"
    faculty_display = auth_user.get("name") or req.facultyName or "Prof A"

    # If student is verified correct, automatically patch the question if an edit is found
    if is_defect:
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
            apply_question_patch(qid, edit, actor=auth_user.get("username", faculty_display))

    cur.execute("""
        UPDATE reports
        SET student_reply = ?,
            verdict = ?,
            status = ?,
            route = ?,
            faculty_name = ?,
            resolved_at = ?
        WHERE report_id = ?
    """, (req.replyText.strip(), new_verdict, new_status, new_route, faculty_display, now_iso, req.reportId))

    conn.commit()
    conn.close()

    record_audit_event(
        action="reply_to_student",
        actor=auth_user.get("username", faculty_display),
        target_type="report",
        target_id=req.reportId,
        details={"verdict": req.verdict, "status": new_status, "reply": req.replyText.strip()[:120]}
    )

    return {
        "success": True,
        "reportId": req.reportId,
        "status": new_status,
        "verdict": req.verdict,
        "studentReply": req.replyText.strip(),
        "message": "Response successfully sent back to student!"
    }

@app.get("/api/professor/reports")
def get_professor_reports(subject: Optional[str] = None, auth_user: dict = Depends(require_faculty_or_admin)):
    conn = get_conn()
    cur = conn.cursor()

    effective_subject = subject
    # If authenticated user is a professor tied to a specific subject, enforce that subject
    if auth_user.get("role") == "professor" and auth_user.get("subject"):
        effective_subject = auth_user["subject"]

    if effective_subject and effective_subject.strip() and effective_subject.lower() != "all":
        cur.execute("""
            SELECT * FROM reports WHERE LOWER(subject) = LOWER(?) ORDER BY reported_at DESC
        """, (effective_subject.strip(),))
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
        "subjectFilter": effective_subject or "All Subjects",
        "count": len(reports_list),
        "reports": reports_list
    }

@app.post("/api/professor/action")
def professor_action(req: ProfessorActionRequest, auth_user: dict = Depends(require_faculty_or_admin)):
    conn = get_conn()
    cur = conn.cursor()

    # Subject access control
    cur.execute("SELECT question_id, subject, edit_json FROM reports WHERE report_id = ?", (req.reportId,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Report '{req.reportId}' not found")

    rep_subject = row["subject"]
    user_subject = auth_user.get("subject")
    if auth_user.get("role") == "professor" and user_subject and user_subject.lower() != rep_subject.lower():
        conn.close()
        raise HTTPException(status_code=403, detail=f"Forbidden: You are assigned to {user_subject}, cannot modify {rep_subject} report")

    new_status = "auto_applied" if req.action == "approve" else "dismissed" if req.action == "reject" else "reviewed"
    new_route = "auto_apply" if req.action == "approve" else "no_change" if req.action == "reject" else "faculty_review"
    now_iso = datetime.now(timezone.utc).isoformat()

    # If approving, also trigger question patch if an edit is present
    if req.action == "approve":
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

    record_audit_event(
        action=f"professor_{req.action}",
        actor=auth_user.get("username", "faculty"),
        target_type="report",
        target_id=req.reportId,
        details={"action": req.action, "new_status": new_status, "new_route": new_route}
    )

    return {"success": True, "reportId": req.reportId, "newStatus": new_status, "newRoute": new_route}

@app.post("/api/professor/approve-fix")
def approve_fix(req: ApproveFixRequest, auth_user: dict = Depends(require_faculty_or_admin)):
    """
    Faculty reviews and approves a fix for a report/question:
    - If edit is present: applies surgical patch via apply_question_patch.
    - If patch precondition fails: returns 409 Conflict without modifying report.
    - If edit-less defect: routes to reviewed/faculty_review without false claims.
    - Preserves pedagogically drafted student reply instead of canned templates.
    - Enforces closed taxonomy verdict 'defect'.
    """
    conn = get_conn()
    cur = conn.cursor()

    target_report = None
    if req.reportId:
        cur.execute("SELECT * FROM reports WHERE report_id = ?", (req.reportId,))
        target_report = cur.fetchone()
        if not target_report:
            conn.close()
            raise HTTPException(status_code=404, detail=f"Report '{req.reportId}' not found")
        rep_subject = target_report["subject"]
        user_subject = auth_user.get("subject")
        if auth_user.get("role") == "professor" and user_subject and user_subject.lower() != rep_subject.lower():
            conn.close()
            raise HTTPException(status_code=403, detail=f"Forbidden: You are assigned to {user_subject}, cannot modify {rep_subject} report")
    else:
        cur.execute("SELECT * FROM reports WHERE question_id = ? ORDER BY reported_at ASC", (req.questionId,))
        target_report = cur.fetchone()

    edit_to_apply = req.edit
    if not edit_to_apply and target_report and target_report["edit_json"]:
        try:
            edit_to_apply = json.loads(target_report["edit_json"])
        except Exception:
            pass
    if not edit_to_apply:
        res = (RESULTS_BY_RID.get(req.reportId) if req.reportId else None) or RESULTS_BY_QID.get(req.questionId)
        if res and res.get("edit"):
            edit_to_apply = res["edit"]

    now_iso = datetime.now(timezone.utc).isoformat()
    faculty_display = auth_user.get("name") or req.facultyName or "Prof A"
    repair_type = target_report["repair"] if target_report else "Question repair"

    updated_q = None
    if edit_to_apply:
        updated_q = apply_question_patch(
            req.questionId,
            edit_to_apply,
            actor=auth_user.get("username", faculty_display),
            repair_type=repair_type
        )
        if not updated_q:
            conn.close()
            raise HTTPException(
                status_code=409,
                detail=f"Precondition failed: Patch 'find' pattern did not match question '{req.questionId}' exactly once. Report status untouched."
            )
        new_status = "auto_applied"
        new_route = "auto_apply"
    else:
        new_status = "reviewed"
        new_route = "faculty_review"

    if req.comment:
        reply_msg = req.comment
    elif target_report and target_report["student_reply"]:
        reply_msg = target_report["student_reply"]
    else:
        reply_msg = f"Feedback reviewed by {faculty_display}. The defect has been queued and validated."

    edit_str = json.dumps(edit_to_apply) if edit_to_apply else None
    target_rid = target_report["report_id"] if target_report else req.reportId

    if target_rid:
        cur.execute("""
            UPDATE reports
            SET status = ?,
                route = ?,
                verdict = 'defect',
                faculty_name = ?,
                resolved_at = ?,
                student_reply = ?,
                edit_json = COALESCE(?, edit_json)
            WHERE report_id = ?
        """, (new_status, new_route, faculty_display, now_iso, reply_msg, edit_str, target_rid))
    else:
        cur.execute("""
            UPDATE reports
            SET status = ?,
                route = ?,
                verdict = 'defect',
                faculty_name = ?,
                resolved_at = ?,
                student_reply = ?,
                edit_json = COALESCE(?, edit_json)
            WHERE question_id = ?
        """, (new_status, new_route, faculty_display, now_iso, reply_msg, edit_str, req.questionId))

    conn.commit()
    conn.close()

    record_audit_event(
        action="approve_fix",
        actor=auth_user.get("username", faculty_display),
        target_type="report" if target_rid else "question",
        target_id=target_rid or req.questionId,
        details={"question_id": req.questionId, "edit": edit_to_apply}
    )

    return {
        "success": True,
        "questionId": req.questionId,
        "reportId": target_rid,
        "newStatus": new_status,
        "newRoute": new_route,
        "updatedQuestion": extract_question_details(updated_q) if updated_q else None,
        "editApplied": edit_to_apply,
        "message": "Fix approved and recorded! Feedback removed from review queue."
    }

@app.post("/api/professor/reject-report")
def reject_report(req: RejectReportRequest, auth_user: dict = Depends(require_faculty_or_admin)):
    """
    Faculty rejects/dismisses report after confirming the question is sound.
    Enforces closed taxonomy verdict 'no_error'.
    """
    conn = get_conn()
    cur = conn.cursor()

    target_report = None
    if req.reportId:
        cur.execute("SELECT * FROM reports WHERE report_id = ?", (req.reportId,))
        target_report = cur.fetchone()
        if not target_report:
            conn.close()
            raise HTTPException(status_code=404, detail=f"Report '{req.reportId}' not found")
        rep_subject = target_report["subject"]
        user_subject = auth_user.get("subject")
        if auth_user.get("role") == "professor" and user_subject and user_subject.lower() != rep_subject.lower():
            conn.close()
            raise HTTPException(status_code=403, detail=f"Forbidden: You are assigned to {user_subject}, cannot modify {rep_subject} report")
    else:
        cur.execute("SELECT * FROM reports WHERE question_id = ? ORDER BY reported_at ASC", (req.questionId,))
        target_report = cur.fetchone()

    now_iso = datetime.now(timezone.utc).isoformat()
    faculty_display = auth_user.get("name") or req.facultyName or "Prof A"
    
    if req.reason:
        reply_msg = f"Feedback reviewed by {faculty_display}. {req.reason}"
    elif target_report and target_report["student_reply"]:
        reply_msg = target_report["student_reply"]
    else:
        reply_msg = f"Thank you for your feedback. {faculty_display} verified the official formulation and derivation: question is sound."

    target_rid = target_report["report_id"] if target_report else req.reportId

    if target_rid:
        cur.execute("""
            UPDATE reports
            SET status = 'dismissed',
                route = 'no_change',
                verdict = 'no_error',
                faculty_name = ?,
                resolved_at = ?,
                student_reply = ?
            WHERE report_id = ?
        """, (faculty_display, now_iso, reply_msg, target_rid))
    else:
        cur.execute("""
            UPDATE reports
            SET status = 'dismissed',
                route = 'no_change',
                verdict = 'no_error',
                faculty_name = ?,
                resolved_at = ?,
                student_reply = ?
            WHERE question_id = ?
        """, (faculty_display, now_iso, reply_msg, req.questionId))

    conn.commit()
    conn.close()

    record_audit_event(
        action="reject_report",
        actor=auth_user.get("username", faculty_display),
        target_type="report" if target_rid else "question",
        target_id=target_rid or req.questionId,
        details={"question_id": req.questionId, "reason": req.reason}
    )

    return {
        "success": True,
        "questionId": req.questionId,
        "reportId": target_rid,
        "newStatus": "dismissed",
        "newRoute": "no_change",
        "message": "Report dismissed as no_error."
    }

@app.post("/api/professor/ai-assist")
def ai_assist(req: AIAssistRequest, auth_user: dict = Depends(require_faculty_or_admin)):
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

    q_subject = q.get("subject", "Physics")
    user_subject = auth_user.get("subject")
    if auth_user.get("role") == "professor" and user_subject and user_subject.lower() != q_subject.lower():
        raise HTTPException(status_code=403, detail=f"Forbidden: You are assigned to {user_subject}, cannot assist on {q_subject} question")

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
def update_question_solution(req: UpdateQuestionSolutionRequest, auth_user: dict = Depends(require_faculty_or_admin)):
    """
    Updates the stored official solution and/or answer key directly in the database,
    making changes in questions.json and updating corresponding student reports.
    """
    global QUESTIONS_DATA, QUESTIONS_MAP
    q = QUESTIONS_MAP.get(req.questionId)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # Access control: check question subject
    q_subject = q.get("subject", "Physics")
    user_subject = auth_user.get("subject")
    if auth_user.get("role") == "professor" and user_subject and user_subject.lower() != q_subject.lower():
        raise HTTPException(status_code=403, detail=f"Forbidden: You are assigned to {user_subject}, cannot modify {q_subject} question")

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
    faculty_display = auth_user.get("name") or req.facultyName or "Prof A"
    reply_msg = (
        f"Correction confirmed! {faculty_display} updated the official solution and approach in our question bank. "
        "The derivation has been revised."
    )

    if req.reportId:
        cur.execute("""
            UPDATE reports
            SET status = 'auto_applied',
                route = 'auto_apply',
                verdict = 'error_verified',
                faculty_name = ?,
                resolved_at = ?,
                student_reply = ?
            WHERE report_id = ?
        """, (faculty_display, now_iso, reply_msg, req.reportId))
    else:
        cur.execute("""
            UPDATE reports
            SET status = 'auto_applied',
                route = 'auto_apply',
                verdict = 'error_verified',
                faculty_name = ?,
                resolved_at = ?,
                student_reply = ?
            WHERE question_id = ?
        """, (faculty_display, now_iso, reply_msg, req.questionId))

    conn.commit()
    conn.close()

    record_audit_event(
        action="update_question_solution",
        actor=auth_user.get("username", faculty_display),
        target_type="question",
        target_id=req.questionId,
        details={"report_id": req.reportId, "answer_key": req.answerKey}
    )

    return {
        "success": True,
        "questionId": req.questionId,
        "updatedQuestion": extract_question_details(q),
        "message": "Question solution and question bank updated successfully in database!"
    }

@app.get("/api/professor/stats")
def get_professor_stats(subject: Optional[str] = None, auth_user: dict = Depends(require_faculty_or_admin)):
    conn = get_conn()
    cur = conn.cursor()

    effective_subject = subject
    if auth_user.get("role") == "professor" and auth_user.get("subject"):
        effective_subject = auth_user["subject"]

    if effective_subject and effective_subject.strip() and effective_subject.lower() != "all":
        cur.execute("""
            SELECT status, count(*) FROM reports WHERE LOWER(subject) = LOWER(?) GROUP BY status
        """, (effective_subject.strip(),))
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

@app.get("/api/audit-log")
def get_audit_log(limit: int = 100, auth_user: dict = Depends(require_faculty_or_admin)):
    """
    Returns the immutable audit log of all system and faculty actions.
    Restricted to authenticated faculty and administrators.
    """
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    return {"count": len(rows), "logs": [dict(r) for r in rows]}

@app.get("/api/subjects")
def get_all_subjects(auth_user: dict = Depends(require_faculty_or_admin)):
    """
    Returns all distinct subjects available in the platform.
    Used by the Dean of Academics to segment and filter reports and faculty workload.
    """
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT subject FROM reports ORDER BY subject ASC")
    rows = [r[0] for r in cur.fetchall() if r[0]]
    conn.close()
    return {"subjects": rows}
