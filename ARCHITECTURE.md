# Acadza Full System Architecture & Technical Specification

## 1. System Overview

Acadza is an AI-powered Question Bank Triage and Pedagogical Assessment Platform engineered for high-stakes Indian entrance examinations (JEE Main, JEE Advanced, and NEET). The platform automates the intake, verification, surgical repair, and faculty resolution of student-reported defects in authentic stem questions, diagrams, and answer keys.

```
+-----------------------------------------------------------------------------------+
|                                 Client Layer                                      |
|  +------------------------------+             +--------------------------------+  |
|  | Student Assessment Portal    |             | Faculty Triage & AI Copilot    |  |
|  | - Test taking & scoring      |             | - Queue management by subject  |  |
|  | - Live doubt & report filing |             | - Surgical diff preview & fix  |  |
|  | - Explanations feed          |             | - Dean multi-department filter |  |
|  +--------------+---------------+             +---------------+----------------+  |
+-----------------|---------------------------------------------|-------------------+
                  | HTTPS / REST                                | Bearer Token (CSPRNG)
+-----------------v---------------------------------------------v-------------------+
|                                Fast API Backend                                   |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | Role-Based Auth    |  | Student Gateway      |  | Faculty Gateway           |  |
|  | - Salted SHA-256   |  | - Answer masking     |  | - RBAC Subject boundary   |  |
|  | - CSPRNG Tokens    |  | - Server-side scoring|  | - Surgical single-report  |  |
|  | - RBAC Dependency  |  | - Feedback intake    |  | - Audit event recording   |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|                                         |                                         |
|  +--------------------------------------v--------------------------------------+  |
|  | AI Co-Pilot & Deterministic Triage Engine                                   |  |
|  | - Adversarial prompt-injection quarantine ("IGNORE ALL PREVIOUS")           |  |
|  | - Math & formula sanity engine (SymPy + AST AST-level validation)          |  |
|  | - Strict taxonomy enforcement (repairs & permitted field scopes)           |  |
|  | - Non-destructive fallback (unknown reports -> faculty_review)             |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
|                               Persistence Layer                                   |
|  +------------------------------------+  +-------------------------------------+  |
|  | SQLite Database (acadza.db)        |  | Question Bank (questions.json)      |  |
|  | - users (salted password hashes)   |  | - 43 Authentic JEE/NEET questions   |  |
|  | - reports (44 seeded + runtime)    |  | - Idempotent patch application      |  |
|  | - audit_log (immutable actions)    |  | - SCQ/MCQ payload integrity         |  |
|  +------------------------------------+  +-------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Subjects & Dataset Specifications

The baseline benchmark dataset consists of:
- **43 Authentic Questions**:
  - **Physics**: 33 questions (Calculus, Electromagnetism, Modern Physics, Mechanics, Waves)
  - **Zoology**: 6 questions (Human Physiology, Animal Kingdom, Genetics)
  - **Botany**: 4 questions (Plant Physiology, Anatomy of Flowering Plants)
- **44 Student Defect Reports**:
  - Seeded from real student submissions (`data/reports.json`), evaluated into `results.json`.

---

## 3. Security, Authentication & Role Boundaries

### 3.1 CSPRNG Token Session Management
- Sessions use unguessable 256-bit cryptographically secure pseudorandom tokens (`secrets.token_urlsafe(32)`), formatted as `tok_<username>_<random_entropy>`.
- Passwords are encrypted with random salt and SHA-256 key stretching (`hash_password`).
- Tokens expire after a strict 7-day TTL and can be revoked instantly.

### 3.2 Role-Based Access Control (RBAC)
Four role classifications are strictly enforced via FastAPI dependencies (`require_faculty_or_admin`):

| Role | Username | Department / Subject | Access Scope |
| :--- | :--- | :--- | :--- |
| **Student** | `student` | None | Test taking, answer submission, own doubt tracking. Solutions & keys are masked before test completion. |
| **Physics Faculty** | `physics_prof` | Physics (`Prof A`) | Inspects, triages, edits, and resolves Physics reports only. |
| **Zoology Faculty** | `zoology_prof` | Zoology (`Prof B`) | Inspects, triages, edits, and resolves Zoology reports only. |
| **Botany Faculty** | `botany_prof` | Botany (`Prof C`) | Inspects, triages, edits, and resolves Botany reports only. |
| **Dean of Academics** | `admin` | All (`Admin`) | Organization-wide access. Segments and reviews across all subjects, inspects system audit logs. |

### 3.3 Server-Side Subject Boundary Enforcement
- Query parameter filtering alone is rejected for authorization.
- When a faculty member calls `/api/professor/*`, the server checks `auth_user["subject"]` against the target report's subject. Cross-department modifications result in `HTTP 403 Forbidden`.
- The Dean of Academics (`role: admin`) has unrestricted access across all departments.

### 3.4 Student Privacy & Anti-Leak Safeguards
- `GET /api/questions` filters out `correctAnswer`, `solutionText`, and answer arrays when called by unauthenticated clients or students.
- Scores and full explanations are computed securely on the backend (`POST /api/student/submit-test`).

---

## 4. Triage Engine, Guardrails & Policy Standards

### 4.1 Strict Taxonomy & Safety Invariants
1. **No AI-Invented Distractors**:
   - In accordance with academic policy, the AI Co-Pilot is strictly forbidden from fabricating distractors.
   - Missing or corrupted distractors (e.g. R009 and R010) are routed to `faculty_review` with `edit: null`, ensuring faculty author authentic distractors.
2. **Surgical Field Scoping**:
   - `answer_key` repairs may only modify `answer`.
   - `stem_data` and `spelling` repairs may only modify `question`.
   - `solution_fix` repairs may only modify `solution`.
3. **Non-Destructive Fail-Open Fallback**:
   - Reports not present in seeded evaluations are triaged via the dynamic NLP pipeline.
   - Ambiguous or failed analyses fall back to `route: "faculty_review"` and `verdict: "pending_review"`. The engine never silently dismisses unknown reports as `no_error`.
4. **Adversarial Injection Defense**:
   - Sanitizer scans for regex patterns such as `IGNORE\s+ALL\s+PREVIOUS\s+INSTRUCTIONS`, `SYSTEM\s*PROMPT`, and jailbreak indicators.
   - Trapped reports are instantly quarantined to `verdict: "not_actionable"` and `route: "no_change"` with zero code execution.
5. **Idempotent Patch Application**:
   - `apply_question_patch` checks if replacement strings already exist before applying.
   - Rejects blind appends if target string is not located.
   - Safely migrates content dictionaries when changing `questionType` (e.g. `mcq` -> `scq` for R021).

---

## 5. Immutable Audit Log Architecture

All administrative, faculty, and system modifications are recorded in the `audit_log` SQLite table:
- Columns: `id`, `action`, `actor`, `target_type`, `target_id`, `details`, `created_at`.
- Actions logged:
  - `login` / `login_failure`
  - `approve_fix`
  - `reject_report`
  - `reply_to_student`
  - `update_question_solution`
  - `db_init`
- Accessible to faculty and administrators at `GET /api/audit-log`.

---

## 6. Deployment Environments & Resilience

- **Vercel Serverless**:
  - Automatically redirects SQLite storage to `/tmp/acadza.db` when `VERCEL` environment variable is detected.
  - Read-only file system operations on `questions.json` are trapped gracefully so the API remains responsive without uncaught crashes.
- **Local Development**:
  - FastAPI running on port 8000.
  - Vite dev server running on port 5173 with proxy configuration.
