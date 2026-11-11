# SUBMISSION.md: Email Application Responses & Video Script

This file contains the verbatim answers for the submission email and the 3-minute screen recording walkthrough script required by Acadza.

---

## Part A: Email Reply Answers

### Repository & Project Links
- **GitHub Repository (Public):** https://github.com/AP-2403/Acadza_internship_Project
- **Live Faculty Review Console URL:** https://acadza-liart.vercel.app/
- **3-Minute Loom / Video Recording URL:** https://youtu.be/_RIMWtqhPlA

### 1. This is a remote, Monday-to-Saturday role for people who want to build real product used by lakhs of students, not an internship to tick a college box. Is that you?
**Yes, absolutely.** I like building products designed to handle real production volume, edge cases, and messy student inputs rather than theoretical exercises. The prospect of directly protecting lakhs of students from losing marks, ranks, and confidence due to bad question data is a great form of problem to tackle. I have no issue in working from Monday to Saturday on building features and products that will be used by students on daily basis .

### 2. How many months can you commit?
**3 months.**

### 3. Earliest start date.
**From start of December.**

### 4. In 2-3 lines, in your own words: why this work, why now?
EdTech platforms are only as trustworthy as their question bank; a single wrong answer key destroys student trust and damages prep morale in high-stakes exams. With modern LLM orchestration and deterministic guardrails, we can now fix this at scale with near zero hallucinations, turning student frustration into instantaneous trust.

---

## Part B: 2.5 to 3-Minute Screen Recording Walkthrough Script

**Target Duration:** 2 minutes 45 seconds (165 seconds) — strictly within the 2.5 to 3 min limit  
**Total Word Count:** ~385 words (comfortable 135–140 words/min pace)  
**Format:** YouTube Walkthrough  
**Link:** https://youtu.be/_RIMWtqhPlA

### Preparation Before You Hit Record:
1. Open two browser tabs:
   - **Tab 1:** `https://acadza-liart.vercel.app/` (logged into Student portal)
   - **Tab 2:** `https://acadza-liart.vercel.app/` (open in incognito, ready at login screen)
2. Mic checked, browser zoomed to 100% or 110% for crisp readability.

---

### Storyboard & Word-for-Word Narration

#### 0:00 - 0:30 (30 sec) | The Hook & High-Stakes Problem
* **On Screen:** Start on the login screen (`https://acadza-liart.vercel.app/`), showing the clean light-mode UI and dual role tabs (Student & Faculty).
* **Narration:**
  > *"Hi Acadza team! In competitive exams like JEE and NEET, 1 mark separates 5,000 ranks. When a question has a wrong answer key, it triggers a catastrophic 5-mark swing: 4 marks missed, plus a 1-mark negative penalty. 
  > 
  > Students report errors with messy, emotional feedback like 'ans galat hai' or 'root(40^2+30^2)=50 then why 130??'. Today, I'm presenting our autonomous Report → Fix platform that turns student frustration into instantaneous, verified trust."*

---

#### 0:30 - 1:10 (40 sec) | Student Test Experience & In-Test Doubt Filing
* **On Screen:** Click Student Login (Aarav Sharma). Show an authentic physics question, answer it, submit the test to reveal the live scorecard, and tap *"Report Doubt"*. Select *"Answer key seems incorrect"* and type a brief note.
* **Narration:**
  > *"First, here is the student experience. Students take authentic JEE/NEET tests with real-time scoring. If they spot an anomaly, they report it directly from their scorecard using quick-action chips. 
  > 
  > Notice that questions mask answers securely on the server until submission. Once filed, the student's doubt is instantly routed to our backend pipeline—no manual support tickets, no lost feedback."*

---

#### 1:10 - 1:55 (45 sec) | Zen Calm Focus Mode & AI Pre-Triage (LCR Defect & Injection Quarantine)
* **On Screen:** Switch to Tab 2. Log in as `Prof A (Physics)`. The console opens directly in **Zen Calm Focus Mode**. Show Question `60f744b3` with the side-by-side Before/After diff card. Then quickly click report `R027` to show the injection quarantine badge.
* **Narration:**
  > *"Now, look at the faculty experience. Tired professors reviewing reports at 10 PM suffer from decision fatigue. That's why we built Zen Calm Focus Mode: an uncluttered, single-question workspace with clean MathML typography and side-by-side surgical diffs.
  > 
  > Here in Report R002, the stored answer was C (130 V). But solving V = sqrt(40^2 + (60 - 30)^2) gives 50 V (Option A). The engine flags the answer mismatch, verifies the derivation, and suggests an atomic replacement from C to A.
  > 
  > And look at Report R027: a student attempted a prompt injection saying 'IGNORE ALL PREVIOUS INSTRUCTIONS'. Our pre-flight sanitizer instantly quarantined it without executing any override."*

---

#### 1:55 - 2:30 (35 sec) | Voice AI Co-Pilot, 1-Click Action & Audit Trail
* **On Screen:** Click the **Voice / Notes Co-Pilot** modal on the physics question. Show the formula sanity check. Then press the big **Approve Fix (A)** button. The queue smoothly glides to the next item.
* **Narration:**
  > *"Teachers can even speak their explanations naturally using our Voice Co-Pilot. Our formula sanity engine catches any verbal arithmetic slips before anything reaches students.
  > 
  > With one tap of 'A' or the Approve button, the fix is atomically applied to our question bank. It is strictly idempotent to prevent restart corruption, and every single change is logged in an immutable SQLite audit trail."*

---

#### 2:30 - 2:55 (25 sec) | Dean Multi-Department Segmentation & Closed Loop
* **On Screen:** Log out and log in as `Dean of Academics (Admin)`. Click through the Department Segmentation Bar: **All Departments (43)** $\rightarrow$ **Physics (33)** $\rightarrow$ **Zoology (6)** $\rightarrow$ **Botany (4)**.
* **Narration:**
  > *"Finally, for leadership, the Dean of Academics gets an institutional bird's-eye view. The Dean can segment queues by department—Physics, Zoology, or Botany—with real-time counters to track review backlogs and SLA compliance across the entire institute.
  > 
  > Back on the student's portal, the doubt is marked resolved with the teacher's exact explanation and corrected score."*

---

#### 2:55 - 3:00 (5 sec) | Conclusion
* **On Screen:** Show the clean, resolved dashboard or landing hero.
* **Narration:**
  > *"This transforms a tedious 3-hour late-night grading chore into a 15-minute verification workflow. Thank you!"*

---

## Part C: Deliverables Checklist

- [x] **`results.json`** committed with 44/44 reports evaluated according to ground truth.
- [x] **`PROMPTS.md`** comprehensive prompt audit, iterations, failures, and design decisions.
- [x] **`PRODUCT.md`** 1-page product memo addressing stakes, auto-apply boundaries, metrics, and new ideas.
- [x] **Faculty Review Console** with MathML rendering, surgical diffs, audit trail, keyboard shortcuts, and responsiveness.
- [x] **Live Console Deployment URL** (Vercel / Render / Netlify).
- [x] **Public GitHub Repository** link ready for email submission.
- [x] **Screen Recording** (3-minute walkthrough video published: https://youtu.be/_RIMWtqhPlA).
