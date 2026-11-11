# Acadza: Autonomous "Report → Fix" Loop for JEE/NEET Question Bank

[![Live Production](https://img.shields.io/badge/Live%20Console-acadza--liart.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://acadza-liart.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-AP--2403%2FAcadza__internship__Project-blue?style=for-the-badge&logo=github)](https://github.com/AP-2403/Acadza_internship_Project)
[![AI Triage Engine](https://img.shields.io/badge/AI%20Triage-Google%20Gemini%20Flash-purple?style=for-the-badge&logo=google)](https://acadza-liart.vercel.app/)
[![Frontend](https://img.shields.io/badge/Console-React%2018%20%2B%20Vite%20%2B%20MathML-indigo?style=for-the-badge&logo=vite)](https://acadza-liart.vercel.app/)

> **Candidate Submission:** Ayyam ([GitHub: @AP-2403](https://github.com/AP-2403))  
> **Live Production URL:** [https://acadza-liart.vercel.app/](https://acadza-liart.vercel.app/)  
> **Repository:** [https://github.com/AP-2403/Acadza_internship_Project](https://github.com/AP-2403/Acadza_internship_Project)  
> **Video Walkthrough:** [Link to 3-Minute Walkthrough Video](#-3-minute-video-walkthrough)  

---

## 📌 Deliverables Quick Reference

| Deliverable | Location | Description |
|---|---|---|
| **1. Live Production Deployment** | [https://acadza-liart.vercel.app/](https://acadza-liart.vercel.app/) | Live, zero-config Vercel deployment with dual portals (Faculty Triage + Student Portal). |
| **2. Ground Truth Results** | [`results.json`](./results.json) | Complete evaluation of all **44 student reports** strictly scored against the taxonomy. |
| **3. Product Philosophy Memo** | [`PRODUCT.md`](./PRODUCT.md) | **$\le$ 1-Page Memo** covering user stakes, zero-auto boundaries, and the Faculty Edit-Reversal Rate (FERR). |
| **4. Prompt Audit & LLM Log** | [`PROMPTS.md`](./PROMPTS.md) | **Mandatory Prompt Audit** containing internal prompts, version changes, assistant directives, and failure post-mortems. |
| **5. Submission Details & Script** | [`SUBMISSION.md`](./SUBMISSION.md) | Answers to application questions + 3-minute video recording storyboard and narration script. |
| **6. Faculty Review Console** | [`console/`](./console/) | Web UI featuring **Zen Calm Focus Mode**, Split Queue Inspector, Voice Dictation, Native MathML, and 1-Click Approvals. |
| **7. Multi-Engine AI Backend** | [`backend/`](./backend/) | FastAPI backend with **Google Gemini Flash LLM Agent**, typo/grammar detection, and atomic DB sync. |

---

## 🚀 The Problem & Our Solution

Acadza serves ~8 lakh JEE/NEET questions to students preparing for high-stakes exams. In exams where negative marking turns an error into a **5-mark rank penalty** (+4 missed, -1 deducted), broken questions damage both student scores and trust.

Students tap **"Report error"** and write noisy, brief feedback:
> *"ans galat hai"* · *"root(40^2+30^2)=50 then why 130??"* · *"Option typo / grammar"* · *"figure missing"*

### What this platform does:
1. **Treats student feedback as a lead, not an instruction:** Uses an autonomous AI agent to independently verify math derivations, check answer keys, and detect scientific typos.
2. **Pre-Triages feedback before faculty arrival:** Newly submitted doubts immediately arrive with formula proofs, surgical diffs, and drafted pedagogical student replies ready for **1-click approval**.
3. **Calm, Stress-Free UI for Tired Faculties:** Features **Zen Calm Focus Mode** (single-question reading column, large 1-click action buttons, zero visual noise) alongside the classic **Split Queue Inspector**.
4. **Voice & AI Co-Pilot with Formula Sanity:** Faculties can speak or type explanations; the agent sanity-checks mathematical formulas (e.g. series LCR phasor theory, electric flux) to catch fatigue-induced slips before dispatch.
5. **Real-Time Atomic Synchronization:** Once approved, fixes are atomically patched into both the SQLite database and live question bank files (`data/questions.json` and `console/src/data/questions.json`), instantly visible to students.

---

## 🏗️ System Architecture

```text
Student Submits Doubt ("50 V option A is correct why C", "Option typo / grammar")
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 1. AI Pre-Triage & Specialist Agent Engine             │
│    - Google Gemini Flash Agent (multi-model fallback)  │
│    - Automated Typo & Scientific Grammar Agent         │
│    - Guard against prompt injection / adversarial text │
│    - Solves derivation & computes surgical diff        │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 2. Real-Time Routing & SQLite Database                 │
│    - Tags route: auto_apply vs no_change vs review     │
│    - Stores clean academic evidence (no dev jargon)    │
│    - Generates empathetic student reply preview        │
└───────────────────────┬────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ 🧘 Calm Focus Mode (UI)  │  │ 📊 Split Queue Inspector │
│ - Single-item view       │  │ - Multi-column view      │
│ - Before vs After diff   │  │ - Arrival time sorting   │
│ - Big 1-click Approve    │  │ - Urgency prioritization │
└──────────────┬───────────┘  └────────────┬─────────────┘
               │                           │
               └─────────────┬─────────────┘
                             ▼
┌────────────────────────────────────────────────────────┐
│ 3. Faculty 1-Click Action & Voice Co-Pilot             │
│    - Approve Fix (A) ➔ Atomically patches question bank│
│    - Voice / Notes Co-Pilot (E) ➔ Formula Sanity Check │
│    - Verify Sound (R) ➔ Dismisses misconception        │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 4. Instant Student Portal Synchronization              │
│    - Live scorecard and step-by-step solution updated  │
│    - "My Doubts" shows resolved status & prof's reply  │
└────────────────────────────────────────────────────────┘
```

---

## 🎨 Key Features & User Experience

### 1. 🧘 Zen Calm Focus Mode (Tailored for Faculties)
* **Single-Question Focus:** Concentrates on one question at a time in an uncluttered, comfortable reading column.
* **Side-by-Side "Before vs After":** Clear visual comparison of what will change upon approval in calm pastel cards.
* **Large Hero Action Bar:** Big, soothing **Approve 1-Click Fix (A)**, **Voice / Notes Co-Pilot (E)**, and **Verify Sound (R)** buttons.
* **Keyboard Navigation:** Effortlessly glide through doubts with `J` / `K` or arrow keys.

### 2. 🎙️ Voice & AI Co-Pilot with Formula Sanity Check
* **Web Speech API Voice Dictation:** Faculties can tap the microphone and speak their approach naturally.
* **Formula Discrepancy Prevention:** If a tired professor inadvertently dictates a wrong arithmetic step or number, the agent gently flags it (*"Sanity Check: $V = \sqrt{40^2+30^2} = 50\text{ V}$, confirm if 50 V was intended"*) with a 1-click "Accept Correction" pill.
* **Pedagogical Student Synthesis:** Translates raw faculty dictation into a student-friendly explanation with clean math typography.

### 3. 🧠 Multi-Engine AI Pre-Triage
* **Google Gemini Flash Agent:** Live HTTPS REST integration with Google AI Studio using automated multi-model fallback (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-3.5-flash`).
* **Automated Typo & Grammar Agent:** Scans for subject-verb agreement (`fossils exists` $\rightarrow$ `fossils exist`), scientific grammar (`evidences` $\rightarrow$ `evidence`), and anatomical terms (`Choroid plexux` $\rightarrow$ `Choroid plexus`).
* **Publication-Quality Math Rendering:** Eliminates raw XML/MathML tags from faculty views; decodes entities (`&#x0003D;` $\rightarrow$ `=`, `&#x000D7;` $\rightarrow$ $\times$) and renders clean mathematical notation.

### 4. 🎓 Student Assessment Portal
* **Realistic Exam Simulator:** Students take SCQ, MCQ, and Integer questions with timer and live answer tracking.
* **Instant Scorecard & Detailed Solutions:** Step-by-step solutions rendered natively.
* **Interactive Doubt System:** One-click feedback chips (*"Answer key seems incorrect"*, *"Option typo / grammar"*, *"Diagram is missing"*) and custom questions.
* **"My Doubts" Live Tracker:** Students can see responses from their professors in real-time.

---

## 📹 3-Minute Video Walkthrough

> **Video Link:** [Insert your Loom / YouTube / Google Drive link here]

### Video Outline & Timestamps:
* **0:00 - 0:45 | Student Assessment & Feedback Submission:** Taking a test, encountering an error, and submitting feedback using quick chips.
* **0:45 - 1:30 | AI Pre-Triage Agent in Action:** Showing how Gemini and the typo engine evaluate the doubt and generate a surgical diff before faculty opens the dashboard.
* **1:30 - 2:15 | Faculty Portal in Calm Focus Mode:** Demonstrating the stress-free single-question view and 1-click approval (`A`).
* **2:15 - 2:45 | Voice Dictation & Formula Sanity Checker:** Demonstrating voice dictation, formula verification, and discrepancy prevention.
* **2:45 - 3:00 | Live Database Patching & Student Reflection:** Showing the question bank update reflecting immediately on the student portal.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### 1. Clone & Setup
```bash
git clone https://github.com/AP-2403/Acadza_internship_Project.git
cd Acadza_internship_Project
```

### 2. Frontend (React + Vite)
```bash
cd console
npm install
npm run dev
# Running at http://localhost:3000
```

### 3. Backend (FastAPI + AI Triage)
```bash
# In another terminal:
python3 -m venv backend_venv
source backend_venv/bin/activate
pip install -r requirements.txt

# (Optional) Add your Gemini API key:
echo "GEMINI_API_KEY=your_key_here" > .env

# Start backend server:
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
# API running at http://localhost:8000
```

---

## 📁 Repository Structure

```text
.
├── console/                        # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── FocusTriageView.tsx       # 🧘 Zen Calm Focus Mode for faculties
│   │   │   ├── FacultyTriageConsole.tsx  # Main Faculty Dashboard & Queue Switcher
│   │   │   ├── FacultySolutionCopilot.tsx# Voice dictation & Formula sanity check
│   │   │   ├── StudentTestPortal.tsx     # Student Test Taking & Doubt Portal
│   │   │   ├── DiffViewer.tsx            # Clean before vs after diff viewer
│   │   │   ├── FormattedMath.tsx         # MathML & KaTeX publication typography
│   │   │   ├── QueueSidebar.tsx          # Multi-column queue with arrival sorting
│   │   │   └── ActionControls.tsx        # 1-Click Approve (A), Adjust (E), Reject (R)
│   │   ├── data/                         # Bundled live questions & reports
│   │   └── lib/api.ts                    # Dynamic production & local API client
│   ├── vercel.json                       # Console Vercel build configuration
│   └── package.json
├── backend/                        # FastAPI Backend & Multi-Engine AI
│   ├── main.py                           # REST API endpoints & DB synchronization
│   ├── ai_copilot.py                     # Gemini Flash LLM + Typo + Formula Engine
│   ├── database.py                       # SQLite database & serverless /tmp mount
│   ├── auth.py                           # Multi-role authentication (Student, Faculty)
│   └── acadza.db                         # Seeded SQLite database
├── data/
│   ├── questions.json                    # Synchronized question bank (43 questions)
│   ├── reports.json                      # 44 student feedback reports
│   └── taxonomy.json                     # Closed verdicts & repairs dictionary
├── engine/                         # Offline CLI evaluation pipeline
│   ├── run_triage.py                     # CLI benchmark generator
│   └── test_engine.py                    # Automated test suite (7/7 passing)
├── api/
│   └── index.py                          # Vercel Serverless ASGI entry point
├── package.json                          # Monorepo build orchestrator
├── requirements.txt                      # Python dependencies
├── vercel.json                           # Root Vercel deployment configuration
├── results.json                          # Evaluated 44 reports benchmark
├── PRODUCT.md                            # Product philosophy memo (<= 1 page)
├── PROMPTS.md                            # Mandatory prompt audit & design decisions
├── SUBMISSION.md                         # Detailed submission memo & video script
└── README.md                             # Documentation (this file)
```

---

## 📬 Internship Application & Submission Questions

Please find below the answers to the questions requested for this submission:

### 1. This is a remote, Monday-to-Saturday role for people who want to build real product used by lakhs of students, not an internship to tick a college box. Is that you?
> **Answer:**  
> [Type your answer here]

---

### 2. How many months can you commit?
> **Answer:**  
> [Type your answer here]

---

### 3. Earliest start date.
> **Answer:**  
> [Type your answer here]

---

### 4. In 2-3 lines, in your own words: why this work, why now?
> **Answer:**  
> [Type your answer here]

---

### Submission Links Summary:
- **Public GitHub Repository:** [https://github.com/AP-2403/Acadza_internship_Project](https://github.com/AP-2403/Acadza_internship_Project)
- **Live Production URL:** [https://acadza-liart.vercel.app/](https://acadza-liart.vercel.app/)
- **Video Walkthrough URL:** `[Insert your video link here]`
