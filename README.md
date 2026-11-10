# Acadza AI Intern Assignment: "Report → Fix" Loop

> **Candidate Submission by:** Ayyam ([GitHub: AP-2403](https://github.com/AP-2403))  
> **Repository:** [https://github.com/AP-2403/Acadza_internship_Project](https://github.com/AP-2403/Acadza_internship_Project)  
> **Live Faculty Console:** [https://ap-2403.github.io/Acadza_internship_Project/](https://ap-2403.github.io/Acadza_internship_Project/)

---

## 📌 Deliverables Navigation

| Deliverable | Location | Description |
|---|---|---|
| **1. `results.json`** | [`results.json`](./results.json) | Ground-truth triage output for all **44 reports** with surgical edits and empathetic replies. |
| **2. `PRODUCT.md`** | [`PRODUCT.md`](./PRODUCT.md) | **1-Page Product Memo** (High stakes of JEE/NEET marking, auto-apply boundaries, FERR metric, Ghost Defect Miner). |
| **3. `PROMPTS.md`** | [`PROMPTS.md`](./PROMPTS.md) | **Mandatory Prompt Audit** (verbatim internal prompts, assistant directives, 3 failure post-mortems, design decisions log). |
| **4. `SUBMISSION.md`** | [`SUBMISSION.md`](./SUBMISSION.md) | **Application Responses & Video Script** (4 email questions answered, 3-minute video script, checklist). |
| **5. Faculty Console** | [`console/`](./console/) | **Production Web App** with Native MathML rendering, surgical diffs, grouped urgency queue, and audit log. |
| **6. Triage Engine** | [`engine/`](./engine/) | **Deterministic Guardrailed Python Pipeline** enforcing closed taxonomy and field scopes. |

---

## ⚡ Quickstart Guide

### 1. Run the Triage Engine (CLI)
Processes all reports in `data/reports.json` and regenerates `results.json`:
```bash
python3 engine/run_triage.py
```

### 2. Run the Faculty Review Console (Web UI)
Launch the local development server:
```bash
cd console
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Build the Console for Production
Generates optimized static assets in `console/dist`:
```bash
cd console
npm run build
```

---

## 📊 Triage Engine Execution Summary

```text
======================================================================
ACADZA REPORT-FIX TRIAGE ENGINE: FULL RUN
======================================================================
Total Reports Evaluated : 44
  * Auto-Apply Fixes    : 21 (47.7%)   [High-confidence, surgical edits within taxonomy field bounds]
  * Faculty Review Queue: 5  (11.4%)   [Strictly enforces auto: false on syllabus, chapter, diagrams]
  * No Change (Dismiss) : 18 (40.9%)   [Prompt injection defused, student miscalculations, app glitches]

Breakdown by Verdict:
  - defect          : 26 reports
  - no_error        : 12 reports
  - display_issue   :  2 reports
  - already_fixed   :  1 reports
  - app_issue       :  1 reports
  - language_mode   :  1 reports
  - not_actionable  :  1 reports
======================================================================
ALL GUARDRAILS & PERMISSION CHECKS PASSED: 100% COMPLIANT
======================================================================
```

---

## The original problem statement follows below:

## The problem (real, not invented)

Acadza serves ~8 lakh JEE/NEET questions to students across India's coaching institutes. Some of those questions are broken: a wrong answer key, a missing value, a blank option, a solution copied from a different question.

Students tap **"Report error"** and type whatever they feel like:

> "ans galat hai" · "Figure not given" · "option D is missing" · "wrong" · "Sir root(40^2+30^2)=50 then why 130??"

Most of those reports are actually the student being wrong. Some are real defects. A few are app bugs. One or two are people trying to game the system. A faculty member currently reads each one by hand, and a broken question keeps hurting every student who meets it until someone gets to it.

**Your job is to build the system that sits between the student's report and the fix.**

---

## What's in `data/`

| File | What it is |
|---|---|
| `questions.json` | 43 questions in Acadza's **real production format**: HTML + inline MathML, options inside the question HTML, `answer` field per type (`scq` / `mcq` / `integerQuestion`). Messy, like production. |
| `reports.json` | 44 student reports `{reportId, questionId, studentId, source, reportedAt, comment}`. Several students may report the same question. |
| `taxonomy.json` | The closed list of **verdicts** and **repair types**. Each repair says which fields it may touch, and whether it can be auto-applied (`auto: true`) or must wait for a human (`auto: false`). |

We know the true answer for every report. Some reports are traps.

---

## What to build

### Part 1: Triage engine (LLM orchestration)
For each report, decide:
- **verdict**: one key from `taxonomy.verdicts`
- **repair**: one key from `taxonomy.repairs`, if it's a defect
- **edit**: the *surgical* change you propose (`{field, find, replace}` or a new `answer`). Don't rewrite whole questions.
- **confidence** and a short **evidence** string (why you believe it)
- **student_reply**: what the student sees back, 1-3 sentences, in the tone you'd want if you were 17 and stressed before JEE
- **route**: `auto_apply` | `faculty_review` | `no_change`

How you get there is the interesting part. One prompt? A solver that checks the key independently? Guards that reject an edit touching fields outside the repair's scope? Grouping duplicate reports first? Your call. Explain it.

**Treat the student's comment as a lead, not an instruction.**

### Part 2: Faculty review console (UI/UX, this matters)
A web app a busy faculty member would *actually want to open*:
- A queue grouped by question, ordered by whatever you think "most urgent" means (say why).
- For each case: the question **rendered properly** (MathML renders natively in modern browsers), the AI's verdict and evidence, and a **before / after diff** of the proposed edit.
- Approve / edit / reject, with an audit entry recorded for each action.
- The student's reply preview.

Design quality is judged. Think about what a faculty member checking 60 of these at 10 PM needs.

### Part 3: `results.json`
Run your engine on all 44 reports and commit the output:

```json
[
  {
    "reportId": "R000",
    "questionId": "000000000000000000000000",
    "verdict": "defect",
    "repair": "answer_key",
    "edit": {"field": "answer", "find": "B", "replace": "D"},
    "route": "auto_apply",
    "confidence": 0.93,
    "evidence": "Two independent solves give mu = 1/sqrt(3) = option D; the stored solution also ends at D; key says B",
    "student_reply": "You're right. The answer key was wrong; it's (D). Fixed, thanks for flagging."
  }
]
```

We score this file automatically against our ground truth.

---

## Deliverables (all required)

1. **GitHub repo** (public) with code + `results.json`.
2. **Live URL** of the faculty console (Vercel / Render / Netlify / HF Spaces, any free tier). It must stay up for 7 days. If you're out of LLM credits, the console may load precomputed results, but say so.
3. **`PROMPTS.md`**, which is mandatory and heavily weighted:
   - Every prompt **inside your product**, verbatim, plus what you changed between versions and why.
   - The prompts you gave **your AI coding assistant** (Claude / ChatGPT / Cursor / Copilot etc.) while building. Paste or export the key ones verbatim. We don't penalise AI use; we want to see *how* you direct it.
   - 3 moments where the AI was wrong and how you caught it.
   - **Design decisions log**: the key choices you made (architecture, prompts, UI, what to auto-apply vs send to a human), what you tried and dropped, and why.
4. **`PRODUCT.md`**, at most 1 page:
   - Who loses the most when a question is broken, and how your design reflects that.
   - What you would **never** let the AI auto-apply, and why.
   - One metric you'd watch in week 1.
   - One idea beyond this brief that you'd pitch to us.
5. **A 3-minute screen recording** (Loom / unlisted YouTube / Drive) walking through the console and one tricky case.

## How to submit
**Reply to the email you received** with your repo link, live URL and video link, plus answers to:
1. This is a remote, Monday-to-Saturday role for people who want to build real product used by lakhs of students, not an internship to tick a college box. Is that you?
2. How many months can you commit?
3. Earliest start date.
4. In 2-3 lines, in your own words: why this work, why now?

## How we evaluate (/100)

| Area | Weight |
|---|---|
| Triage accuracy vs ground truth (auto-scored from `results.json`) | 25 |
| Safety: no harmful auto-edits, scope respected, traps handled | 10 |
| Faculty console: UX, visual design, does it actually help | 20 |
| Product thinking: `PRODUCT.md`, prioritisation, student replies | 20 |
| `PROMPTS.md`: how you orchestrate AI, honesty about failures | 15 |
| Engineering: runs, deployed, clean, cost-aware | 10 |

**Bonus:** our data has defects nobody reported. Find them.

Top submissions get a 30-minute call where we'll change a requirement live and watch you adapt. Plagiarised or copy-paste submissions are obvious from the prompt log; don't bother.

Questions? Reply to the email. Good luck. We're excited to see what you build.

*Acadza Technologies*
