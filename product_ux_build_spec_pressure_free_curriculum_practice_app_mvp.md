# Cool S‑Cool
## Product, UX & Build Specification
### Pressure‑free Curriculum Practice App (MVP)

---

## 1. Purpose of This Document

This document translates the **frozen philosophy, architecture, and learning principles** of **Cool S‑Cool** into a **clear product, UX, and build specification**.

It exists to ensure that the app:
- Is **visually engaging, modern, and enjoyable** for children
- Never becomes stressful, competitive, or exam‑intimidating
- Remains syllabus‑accurate, calm, and trustworthy

This document is implementation‑oriented but **non‑technical**. It defines *what the app must feel like and do*.

---

## 2. Product Identity & Emotional Goal

### 2.1 How the App Should Feel to a Child

- “This feels friendly, not scary.”
- “I can try again without feeling bad.”
- “This looks cool — not like school software.”
- “I understand what I know and what I need to practise.”

The app must feel closer to a **well‑designed game menu** than an exam portal — without becoming noisy or gimmicky.

---

## 3. Visual & Interaction Principles (Frozen)

### 3.1 Visual Style

- Clean, modern, minimal
- Soft colours with contrast (no harsh reds/greens)
- Rounded cards, subtle motion, smooth transitions
- No cluttered dashboards

### 3.2 Interaction Style

- One primary action per screen
- Calm micro‑animations (fade, slide, progress fill)
- No flashing timers or aggressive countdowns

### 3.3 Language & Copy

- Encouraging but honest
- Neutral tone (no hype, no judgement)
- Short, clear sentences

Examples:
- “Let’s try another one.”
- “This topic is getting familiar.”
- “You’re building confidence here.”

---

## 4. Homepage (Public, No Login)

### 4.1 Goals of Homepage

- Clearly explain what the app is
- Visually signal that it is calm, modern, and safe
- Allow immediate hands‑on experience

### 4.2 Homepage Structure

1. **Hero Section**
   - Clear value statement
   - CTA: “Try a sample quiz”

2. **What Makes This Different**
   - No pressure
   - No ranks
   - Syllabus‑accurate

3. **Sample Quizzes (Free)**
   - ICSE → Class 5 → Maths → 2–3 Topics
   - Fully playable, no login

4. **How Progress Works**
   - Visual explanation of proficiency bands

5. **Primary CTA**
   - “Create your practice space”

---

## 5. Core App Navigation (Post‑Login)

### 5.1 Navigation Hierarchy

Boards → Standards → Subjects → Topics → Quiz

Navigation must feel:
- Predictable
- Shallow (no deep nesting anxiety)
- Visually card‑based

---

## 6. Quiz Experience (Core of the App)

### 6.1 Before Quiz

- Topic selected
- Time mode chosen:
  - Unlimited
  - 10 min
  - 5 min
  - 3 min

Timers are framed as **practice styles**, not tests.

---

### 6.2 During Quiz

- One question at a time
- Clean focus area
- Optional timer display (never aggressive)

---

### 6.3 After Each Question

- Immediate feedback
- Canonical explanation shown
- Tone is factual and calm regardless of correctness

---

### 6.4 End of Quiz

- Session summary
- Proficiency update
- Suggest retry or new topic

No marks. No percentages.

---

## 7. Proficiency Representation (Frozen)

- Shown **per topic**
- Expressed as qualitative bands
- Visualised via calm progress indicators

Example bands:
- Exploring
- Building familiarity
- Growing confidence
- Consistent understanding

Trend matters more than any single attempt.

---

## 8. Authentication Flow

- Google Auth only
- Triggered when:
  - User wants to save progress
  - User wants full syllabus access

Never forced on homepage or sample quizzes.

---

## 9. Payments & Paywall

### 9.1 Subscription Model

Per Board + Standard:
- Single subject access
- All subjects access

---

### 9.2 Paywall Rules

- Appears only when accessing locked content
- Never interrupts an active quiz
- Clearly explains value

---

## 10. Profile & Guardian Access

### 10.1 Student Profile

- Personal progress dashboard
- Subscription status

### 10.2 Guardian Access

- Up to 2 guardian emails
- View‑only access
- No quiz interaction

---

## 11. MVP Scope (Explicit)

### Included
- ICSE Class 5 Maths
- Sample quizzes
- Google Auth
- Payments
- Proficiency tracking

### Excluded
- Social features
- Leaderboards
- Cross‑class bundles
- Teaching content

---

## 12. Non‑Negotiables

- Accuracy over engagement tricks
- Calm over excitement
- Trust over scale

---

## Final Product Statement

> ****Cool S‑Cool** should feel like a calm, modern space where children enjoy practising — not a place where they feel tested.**

This document governs all MVP build decisions.

