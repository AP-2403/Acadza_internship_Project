# PRODUCT.md: The "Report → Fix" System Philosophy

## 1. Who Loses the Most When a Question is Broken?
The **17-year-old student preparing for JEE/NEET loses the most**, closely followed by the **overburdened subject faculty**.

In high-stakes exams where 1 mark separates 5,000 ranks, a broken question doesn't just cost -1 in negative marking; it triggers a **5-mark swing** (+4 missed, -1 deducted). More dangerously, it erodes conceptual confidence: a student who mastered Gauss's Law or LCR resonance questions their own intellect when an erroneous key marks them wrong at 11:30 PM. 

Simultaneously, **faculties lose cognitive stamina**: reviewing 60 unstructured, noisy reports late at night (*"ans galat hai"*, *"wrong"* ) causes decision fatigue and missed errors.

**How our product design reflects this:**
1. **Immediate AI Pre-Triage:** Newly reported doubts arrive pre-evaluated with mathematical derivation proofs, surgical diffs, and drafted pedagogical replies ready for 1-click faculty sign-off.
2. **🧘 Zen Calm Focus Mode for Faculties:** Rather than overwhelming tired professors with crowded data tables, our console defaults to an uncluttered single-question view with large, soothing action buttons and smooth keyboard glide (`J`/`K`).
3. **Voice & AI Co-Pilot with Formula Sanity:** Faculties can speak their explanation naturally; the agent sanity-checks mathematical formulas (e.g. series LCR phasor theory, flux) to prevent fatigue-induced slips before dispatch.
4. **Empathetic, Transparent Student Replies:** We never send canned bot responses. If the key was wrong, we validate their effort and immediately unblock their score; if they were wrong, we gently explain the conceptual trap.

---

## 2. What We Would NEVER Let the AI Auto-Apply (And Why)
We strictly enforce a deterministic safety boundary where the AI is prohibited from auto-applying:
1. **Missing or Corrupted Diagrams (`diagram`):** Diagrams require exact vector angles and geometric clarity. An AI hallucinating coordinate systems or vector arrows misleads thousands of students.
2. **Identical Options & Distractor Generation (`identical_options`):** Writing plausible distractors is creative pedagogical authoring. The AI may propose suggestions, but a human educator must approve them.
3. **Syllabus Rationalization (`syllabus`):** Recent NTA/NMC syllabus deletions (e.g., NEET 2024/2025) require curriculum-committee authority. Prematurely marking a question "out of syllabus" creates false student complacency.
4. **Question Retractions (`unsound`) & Full Restatements (`wrong_question`):** Withdrawing a question or awarding bonus marks affects coaching batch percentiles and institute credibility; human sign-off is non-negotiable.
5. **Adversarial / Flagged Injections:** Any report attempting prompt override (`"IGNORE ALL PREVIOUS INSTRUCTIONS"`) is quarantined for human review.

---

## 3. The One Metric We Would Watch in Week 1
**Faculty Edit-Reversal Rate (FERR) / Post-Remediation Re-Report Rate:**
> *Percentage of AI auto-applied fixes (or faculty-approved fixes) that receive a second student report or faculty edit within 7 days.*

- **Target:** `< 1.5%`.
- **Why this metric:** Speed of remediation is useless if our surgical patches introduce secondary bugs. If FERR spikes above 2%, the confidence threshold automatically ratchets from 0.90 to 0.95.

---

## 4. One Idea Beyond This Brief We Pitch to Acadza
**"Telemetry-Driven Ghost Defect Miner" (Zero-Report Defect Detection)**

Students only report ~5% of broken questions; 95% suffer in silence or assume they are at fault. We propose mining real-time test attempt telemetry across Acadza’s 8 lakh question bank:
- **Top-Decile Inversion Anomaly:** When the top 10% highest-scoring students consistently select Option A, but the answer key is Option C, the system flags the question as a key defect with 99% probability before any student complains.
- **Dwell Time Outliers:** If average solve time on an "EASY" question is 4.5 minutes instead of 1 minute, it indicates missing parameters or corrupted rendering.
- **Negative Point-Biserial Discrimination ($r_{pbi} < -0.2$):** High scorers get the question wrong more often than low scorers—a mathematical fingerprint of ambiguous phrasing or erroneous keys.

This shifts Acadza from **reactive dispute triage** to **autonomous proactive quality assurance**.
