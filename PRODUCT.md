# PRODUCT.md: The "Report → Fix" System Philosophy

## 1. Who Loses the Most When a Question is Broken?
The **17-year-old student preparing for JEE/NEET loses the most**. 

In high-stakes exams where 1 mark separates 5,000 ranks, a broken question doesn't just cost -1 in negative marking; it triggers a **5-mark swing** (+4 missed, -1 deducted). More dangerously, it erodes conceptual confidence: a student who mastered Gauss's Law or LCR resonance questions their own intellect when an erroneous key marks them wrong at 11:30 PM. 

**How our design reflects this:**
1. **Answer-key priority in triage:** Any report flagging an answer discrepancy on a high-traffic question is assigned top urgency in the faculty queue.
2. **Empathetic, transparent student replies:** We never send canned bot responses like *"Your feedback is recorded"*. If the key was wrong, we openly admit it and validate their hard work. If they were wrong, we gently highlight the subtle conceptual trap without condescension.
3. **Instant unblocking:** When an answer key error has high-confidence independent proof, it is auto-remediated immediately, recalculating student test scores retroactively.

---

## 2. What We Would NEVER Let the AI Auto-Apply (And Why)
We strictly enforce a deterministic safety boundary where the LLM is restricted from auto-applying:
1. **Missing or Corrupted Diagrams (`diagram`):** A diagram requires spatial accuracy and exact vector arrows. An AI generating SVG/images can hallucinate subtle geometry errors that mislead thousands.
2. **Identical Options & Distractor Generation (`identical_options`):** Writing plausible distractors is pedagogical authoring. The AI must never invent new options without faculty sign-off.
3. **Syllabus Exclusions (`syllabus`):** Recent NTA/NMC syllabus rationalizations (e.g., deleted chapters in NEET 2024/2025) require curriculum-committee authority. Prematurely marking a question "out of syllabus" creates false comfort.
4. **Unsound Questions (`unsound`) & Question-Solution Mismatches (`wrong_question`):** Withdrawing a question or awarding bonus marks affects coaching batch percentiles and institute credibility; human sign-off is non-negotiable.
5. **Low Confidence (< 0.90) or Divergent Solves:** If independent multi-step verification diverges from the stored key or solution, it is automatically routed to `faculty_review`.

---

## 3. The One Metric We Would Watch in Week 1
**Faculty Edit-Reversal Rate (FERR) / Post-Remediation Re-report Rate:**
> *Percentage of AI auto-applied fixes (or faculty-approved fixes) that receive a second student report or faculty edit within 7 days.*

- **Target:** `< 1.5%`.
- **Why this metric:** Triage speed is useless if our fixes introduce subtle secondary defects. If FERR spikes above 2%, the auto-apply confidence threshold must immediately ratchet up from 0.90 to 0.95.

---

## 4. One Idea Beyond This Brief We Pitch to Acadza
**"Telemetry-Driven Ghost Defect Miner" (Zero-Report Defect Detection)**

Students only report ~5% of defective questions; 95% suffer in silence or assume they are stupid. 
We propose mining real-time test attempt telemetry across Acadza’s 8 lakh question bank:
- **Top-Decile Inversion Anomaly:** When the top 10% scoring students consistently pick Option C, but the answer key is Option A, the question is flagged with 99% probability as a defective key before anyone reports it.
- **Dwell Time Outliers:** If average solve time on an "EASY" rated question is 4.5 minutes instead of 1 minute, it indicates missing values or formatting corruption.
- **Negative Biserial Correlation:** A negative discrimination index ($r_{pbi} < -0.2$) indicates that high scorers get the question wrong more often than low scorers—a classic signature of ambiguous phrasing or key errors.

This shifts Acadza from **reactive triage** to **autonomous proactive quality assurance**.

