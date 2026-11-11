# PRODUCT.md: The "Report → Fix" System Philosophy

## 1. Who Loses the Most When a Question is Broken?
The **17-year-old student preparing for JEE/NEET loses the most**, closely followed by the **overburdened subject faculty**.

In high-stakes exams where 1 mark separates 5,000 ranks, a broken question doesn't just cost -1 in negative marking; it triggers a **5-mark swing** (+4 missed, -1 deducted). More dangerously, it erodes conceptual confidence: a student who mastered Gauss's Law or LCR resonance questions their own intellect when an erroneous key marks them wrong at 11:30 PM. 

Simultaneously, **faculties lose cognitive stamina**: reviewing dozens of unstructured, noisy reports (44 seeded benchmarks + live runtime submissions) late at night (*"ans galat hai"*, *"wrong"* ) causes decision fatigue and missed errors.

**How our product design reflects this:**
1. **Immediate AI Pre-Triage:** Newly reported doubts arrive pre-evaluated with mathematical derivation proofs, surgical diffs, and drafted pedagogical replies ready for 1-click faculty sign-off.
2. **🧘 Zen Calm Focus Mode for Faculties:** Rather than overwhelming tired professors with crowded data tables, our console defaults to an uncluttered single-question view with large, soothing action buttons and smooth keyboard glide (`J`/`K`).
3. **Voice & AI Co-Pilot with Formula Sanity:** Faculties can speak their explanation naturally; the agent sanity-checks mathematical formulas (e.g. series LCR phasor theory, flux) to prevent fatigue-induced slips before dispatch.
4. **Empathetic, Transparent Student Replies:** We never send canned bot responses. If the key was wrong, we validate their effort and immediately unblock their score; if they were wrong, we gently explain the conceptual trap.
5. **Dean Department Segmentation:** Institutional leaders can segment triage queues and live doubt feeds by subject (Physics, Zoology, Botany) with live counters to isolate department backlogs and ensure SLA adherence without cognitive clutter.

---

## 2. What We Would NEVER Let the AI Auto-Apply (And Why)
We strictly enforce a deterministic safety boundary where the AI is prohibited from auto-applying:
1. **Missing or Corrupted Diagrams (`diagram`):** Diagrams require exact vector angles, phase markers, and geometric clarity. An AI hallucinating coordinate systems or vector arrows misleads thousands of students.
2. **Missing Distractors & Identical Options (`identical_options`, `option_repair`):** Writing plausible distractors is creative pedagogical authoring. The AI must never invent synthetic distractors without authoritative sources (e.g., auto-generating `(D) 15 m/s` for R009/R010 when the solution only derives 10 m/s). Missing options are strictly routed to `faculty_review` with `edit: null` so human educators author authentic distractors.
3. **Syllabus Rationalization (`syllabus`):** Recent NTA/NMC syllabus deletions (e.g., NEET 2024/2025) require curriculum-committee authority. Prematurely marking a question "out of syllabus" (e.g., R026) creates false student complacency.
4. **Question Retractions (`unsound`) & Full Restatements (`wrong_question`):** Withdrawing a question or awarding bonus marks affects coaching batch percentiles and institute credibility; human sign-off is non-negotiable.
5. **Adversarial / Flagged Injections:** Any report attempting prompt override (`"IGNORE ALL PREVIOUS INSTRUCTIONS"`, R027) is quarantined for human review.

---

## 3. The One Metric We Would Watch in Week 1
**Faculty Edit-Reversal Rate (FERR) / Post-Remediation Re-Report Rate:**
> *Percentage of AI auto-applied fixes (or faculty-approved fixes) that receive a second student report, faculty edit, or reversal within 7 days.*

- **Target:** `< 1.5%`.
- **Dynamic FERR Threshold Ratchet Implementation:**
  Speed of remediation is useless if our surgical patches introduce secondary bugs. We implement this directly in code (`calculate_ferr()` in `engine/guardrails.py` querying SQLite `audit_log`):
  $$\text{FERR} = \frac{\text{Reversals or Secondary Re-Reports}}{\text{Total Fixes Approved / Auto-Applied}} \times 100$$
  If FERR exceeds **2.0%**, the system's minimum confidence threshold for `auto_apply` automatically ratchets from **0.90 to 0.95**, instantly routing borderline defects to faculty review until remediation quality stabilizes.

---

## 4. One Idea Beyond This Brief We Pitch to Acadza
**"Telemetry-Driven Ghost Defect Miner" (Zero-Report Defect Detection)**

Students only report ~5% of broken questions; 95% suffer in silence or assume they are at fault. We propose mining real-time test attempt telemetry across Acadza’s 8 lakh question bank:
- **Top-Decile Inversion Anomaly:** When the top 10% highest-scoring students consistently select Option A, but the answer key is Option C, the system flags the question as a key defect with 99% probability before any student complains.
- **Dwell Time Outliers:** If average solve time on an "EASY" question is 4.5 minutes instead of 1 minute, it indicates missing parameters or corrupted rendering.
- **Negative Point-Biserial Discrimination ($r_{pbi} < -0.2$):** High scorers get the question wrong more often than low scorers—a mathematical fingerprint of ambiguous phrasing or erroneous keys.

This shifts Acadza from **reactive dispute triage** to **autonomous proactive quality assurance**.
