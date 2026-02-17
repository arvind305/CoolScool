# CoolSCool Cognitive Depth Framework

## Why This Exists

A student learns "Classification of Vertebrates" in school on Monday. They open CoolSCool that evening and take a quiz. The next day, they take another quiz on the same topic. And the next. By the end of the week, they should be genuinely exam-ready — not because they memorized answers, but because they understood the topic across every dimension their school will test.

This document defines how CoolSCool achieves that. It is the constitution for question design, selection, and proficiency measurement across every subject and topic in the app.

---

## The Problem We Solve

Most quiz apps test **recall** — "Fish breathe through ___". A student can answer 50 recall questions correctly and still freeze when their school test asks: *"An animal has smooth moist skin, lays eggs in water, and its young ones breathe through gills. Identify the class and give a reason."*

That's because **knowing a fact** and **being able to use it** are different skills. Schools test both. CoolSCool must test both.

The other problem is **repetition**. When a student repeats a topical quiz and sees the same questions, they're practicing recognition memory, not understanding. The app gives them confidence without competence. That's worse than not studying at all.

---

## Core Principle: Depth Mirrors How Students Actually Learn

When a student learns a chapter in school, their understanding deepens naturally:

1. **First, they learn the names and facts** — vocabulary, definitions, basic properties
2. **Then they understand the differences** — how things compare, what distinguishes one from another
3. **Then they can apply it to new situations** — given unfamiliar descriptions, they can figure it out
4. **Then they handle the tricky cases** — edge cases, exceptions, things that seem like one category but are actually another
5. **Then they can explain and justify** — why something is classified a certain way, not just what it is

CoolSCool mirrors this progression across quiz sessions. Each time a student takes a quiz on the same topic, the questions get cognitively deeper — not just harder, but testing from different angles.

---

## The Cognitive Level Taxonomy

Every question in CoolSCool is tagged with a `cognitive_level` that describes what kind of thinking it requires. This exists alongside the existing `difficulty` tier (familiarity/application/exam_style) — they are orthogonal dimensions.

### The Six Levels

| Level | Code | What It Tests | When Students Encounter It |
|-------|------|---------------|---------------------------|
| **Recall** | `recall` | Direct fact retrieval. Can the student name it? | First sessions — building vocabulary |
| **Compare** | `compare` | Differentiate two things on a specific criterion | After basic facts are solid |
| **Classify** | `classify` | Given features/description, identify the category | Alongside comparison |
| **Scenario** | `scenario` | Apply knowledge to a real-world or story-based situation | After understanding differences |
| **Exception** | `exception` | Handle tricky edge cases that defy simple rules | After comfortable with application |
| **Reason** | `reason` | Explain WHY something is the way it is, justify a classification | Highest level — exam mastery |

### How They Map to Difficulty Tiers

The cognitive level and difficulty tier work together:

```
familiarity  + recall    = "Fish breathe through ___" (easy fact)
familiarity  + classify  = "An animal with feathers belongs to class ___" (easy classification)
application  + compare   = "How does Amphibia differ from Reptilia in skin type?" (apply comparison)
application  + scenario  = "Riya saw an animal at the zoo with fins and gills..." (apply to situation)
exam_style   + exception = "Which is a mammal: Shark, Penguin, Bat, or Crocodile?" (tricky exam question)
exam_style   + reason    = "Why is a dolphin a mammal and not a fish?" (full-marks exam answer)
```

A `familiarity + recall` question and an `exam_style + reason` question are miles apart in what they demand — even if both are about the same concept (e.g., Class Mammalia).

### Natural Weighting Across Difficulty Tiers

While any cognitive level can appear at any difficulty, the natural distribution is:

| Difficulty Tier | Primary Cognitive Levels | Secondary |
|-----------------|------------------------|-----------|
| `familiarity` | recall, classify | compare |
| `application` | compare, classify, scenario | exception |
| `exam_style` | scenario, exception, reason | compare |

This isn't enforced rigidly — a `familiarity + compare` question is fine (e.g., "Are fish warm-blooded or cold-blooded?"). The weighting is guidance for question authors, not a hard rule for the algorithm.

---

## The Student Journey (How Sessions Progress)

Here is what a student experiences when they study a topic across multiple sessions:

### Session 1 — "I just learned this chapter"

All concepts are new. The app serves mostly **recall** and easy **classify** questions at **familiarity** difficulty.

> "Animals with a backbone are called ___" (recall)
> "Fish breathe through ___" (recall)
> "Which class has feathers and lays eggs?" (recall)
> "True or False: Reptiles have smooth moist skin" (recall)
> "An animal with fur that feeds milk to its young belongs to class ___" (classify)

The student is getting comfortable with the vocabulary. They get 7-8 out of 10.

**After session:** The app knows which concepts the student is comfortable with and which ones they struggled on.

### Session 2 — "Let me try again"

Yesterday's 10 questions are deprioritized — the student sees entirely fresh questions. The app starts introducing **comparison** and more **classification** questions.

> "How many chambers does a fish's heart have?" (recall — fresh, never asked before)
> "Reptiles have ___ skin while Amphibians have ___ skin" (compare)
> "An animal lays eggs in water and its young breathe through gills. It belongs to class ___" (classify from description)
> "Arrange vertebrate classes from water-dwelling to fully land-dwelling" (ordering — cognitive: classify)

The student is now being asked to DIFFERENTIATE, not just recall. They get 6-7/10 — harder, but they're learning more deeply.

**After session:** Some concepts reach familiarity mastery (4/5 correct) and advance to application difficulty.

### Session 3 — "I'm getting better at this"

20 questions have been asked previously — all deprioritized. Application-level questions appear for mastered concepts. **Scenario** questions arrive.

> "Riya visited a zoo. She saw an animal with a streamlined body, fins, and scales that breathes through gills. Which class does it belong to?" (scenario)
> "Both Reptilia and Amphibia have three-chambered hearts. How can you tell them apart?" (compare — specific criterion)
> "Which of these animals is warm-blooded? (A) Frog (B) Snake (C) Crocodile (D) Pigeon" (classify — application level)

The student is no longer just remembering — they're THINKING.

### Session 4 — "Can I handle the tricky ones?"

The **exception** and **reason** questions arrive. These are what schools love to put on exams.

> "A dolphin lives in water and has fins. Why is it classified as Mammalia and not Pisces?" (reason)
> "Which of these is a mammal? (A) Shark (B) Penguin (C) Bat (D) Crocodile" (exception)
> "A student says 'All animals that lay eggs are birds.' Is this correct? Explain." (reason — challenges misconception)

### Session 5+ — "I'm exam ready"

Complex scenarios, multi-concept questions, and previously-wrong questions resurfacing with enough gap for genuine spaced repetition.

> Passage: "At a wildlife sanctuary, you observe 5 animals with these features..." (scenario — complex)
> "A turtle and a frog both live near water. Explain why they belong to different classes." (reason + compare)

By now, the student has seen 50+ unique questions across ALL cognitive dimensions. They haven't memorized — they've understood.

---

## How Proficiency Becomes Trustworthy

With this framework, each proficiency band maps to genuine capability:

| Proficiency Band | What the Student Can Actually Do |
|------------------|----------------------------------|
| **Not Started** | Has not attempted the topic |
| **Building Familiarity** | Can name key terms and basic facts (recall) |
| **Growing Confidence** | Can compare things and classify from descriptions (compare + classify) |
| **Consistent Understanding** | Can handle scenarios and apply knowledge to new situations (scenario + classify) |
| **Exam Ready** | Can handle tricky exceptions and explain reasoning (exception + reason) |

When a parent sees "Exam Ready", it means their child has been tested from every angle that a school exam will test. The label means something.

---

## Three Mechanisms for Freshness

### 1. Larger Question Pool (Foundation)

Each topic should have **80-100 questions** (up from ~50). With 10 questions per session, that's 8-10 sessions of completely unique content. Most students reach Exam Ready in 5-7 sessions — they may never see a repeat.

**Question pool target per concept (assuming 5 concepts per topic):**

| Cognitive Level | Per Concept | Total (5 concepts) |
|-----------------|-------------|---------------------|
| recall | 3-4 | 15-20 |
| compare | 2-3 | 10-15 |
| classify | 2-3 | 10-15 |
| scenario | 2-3 | 10-15 |
| exception | 1-2 | 5-10 |
| reason | 1-2 | 5-10 |
| **Total** | **~16** | **~80** |

Not every concept will have exceptions (maths concepts often don't), but every concept should have at least recall + compare + classify + scenario.

### 2. Question-Level History (Algorithm)

The selection algorithm tracks which specific questions a student has answered. Recent questions receive a recency penalty in priority scoring:

| When Last Seen | Penalty |
|----------------|---------|
| Last session (just yesterday) | -80 (almost certainly skip) |
| 2 sessions ago | -50 |
| 3 sessions ago | -30 |
| 4+ sessions ago | -10 (fine to revisit — healthy spaced repetition) |
| Never seen | +20 (bonus for fresh content) |

This works WITH the existing adaptive priority scoring (concept mastery, recommended difficulty, etc). A critical question for a weak concept might still surface even if recently seen, but the algorithm strongly prefers fresh questions.

### 3. Cognitive Angle Variety (Depth)

Even when a concept repeats across sessions, each question tests it from a different angle:

- Session 1: "Frogs belong to class ___" (recall)
- Session 2: "How does Amphibia differ from Reptilia in skin type?" (compare)
- Session 3: "An animal has smooth moist skin and lays eggs in water. Which class?" (classify)
- Session 4: "Why do amphibians need to return to water to lay eggs?" (reason)

Same concept (Class Amphibia), four sessions, zero feeling of repetition. The student doesn't realize they're being reinforced on the same concept because the cognitive angle is different each time.

---

## Question Authoring Guidelines

When creating questions for any topic, follow this framework:

### Required Fields

Every question must have:

```json
{
  "question_id": "T10.01.Q058",
  "type": "mcq",
  "concept_id": "T10.01.C04",
  "difficulty": "application",
  "cognitive_level": "compare",
  "question_text": "...",
  "options": [...],
  "correct_answer": "B",
  "explanation_correct": "...",
  "explanation_incorrect": "..."
}
```

The `cognitive_level` field is required for all new questions. Existing questions without it default to `recall`.

### Cognitive Level Definitions and Examples

#### `recall` — Can the student name it?

Test direct fact retrieval. One concept, one fact, one answer.

- "Fish breathe through ___" → gills
- "What is the formula for speed?" → distance/time
- "The process of food-making in plants is called ___" → photosynthesis

**Authoring tip:** If the answer is a single word or name that appears directly in the textbook, it's recall.

#### `compare` — Can the student tell things apart?

Test differentiation between two or more things on a **specific criterion**. The question must name the criterion or make it obvious.

- "How does Class Reptilia differ from Class Mammalia in the number of heart chambers?" → Reptilia has 3, Mammalia has 4
- "Which has parallel venation — monocots or dicots?" → monocots
- "How is evaporation different from boiling?"

**Authoring tip:** Good compare questions follow the pattern: "How does X differ from Y in [specific criterion]?" or "Which of X/Y has [property]?"

#### `classify` — Can the student sort based on features?

Give a description (features, properties, characteristics) and ask the student to identify the category. The reverse of recall — instead of "What are the features of X?", ask "Given these features, what is it?"

- "An animal has dry scaly skin, lays eggs, and breathes through lungs. It belongs to class ___" → Reptilia
- "A triangle with all sides equal is called ___" → equilateral
- "A substance that turns blue litmus red is a ___" → acid

**Authoring tip:** Good classify questions describe 2-3 features and ask for the label. They test whether the student can work BACKWARDS from features to category.

#### `scenario` — Can the student apply it to a situation?

Embed knowledge in a real-world or story-based context. The student must extract the relevant information from the scenario and apply their knowledge.

- "Riya visited a zoo and saw an animal with a streamlined body, fins, and scales. It was swimming in a tank and breathing through gills. Which class does it belong to?"
- "A farmer has a rectangular field 50m long and 30m wide. How much fencing does he need?"
- "When Amit left an iron nail in water for a week, it turned reddish-brown. What happened?"

**Authoring tip:** Scenario questions have a character (Riya, Amit) or a situation (zoo, farm, kitchen) and require the student to figure out what concept applies. The longer question text IS the feature.

#### `exception` — Can the student handle the tricky cases?

Test edge cases, common misconceptions, and things that SEEM like one category but are actually another. These are the "gotcha" questions that appear on exams.

- "Which of these is a mammal? (A) Shark (B) Penguin (C) Bat (D) Crocodile" → Bat (it flies but is a mammal)
- "Is zero a natural number?" → No (common misconception)
- "A whale lives in the ocean. Is it a fish? Explain." → No, it's a mammal

**Authoring tip:** Think about what a student would WRONGLY answer based on surface-level thinking. Build questions around those misconceptions. Not every concept has exceptions — only add them where genuine tricky cases exist.

#### `reason` — Can the student explain WHY?

Test the ability to justify, explain causation, or provide reasoning. The student must go beyond "what" to "why".

- "Why is a dolphin classified as Mammalia and not Pisces, even though it lives in water?"
- "Why do bryophytes need water for reproduction?"
- "Explain why metals are good conductors of heat."

**Authoring tip:** Good reason questions start with "Why", "Explain why", or "Give a reason for". The student must connect features to classification principles. For MCQ format, the options should be different possible reasons, not different classifications.

### Quality Checklist for Each Topic

Before a topic's question bank is considered complete, verify:

- [ ] Every concept has at least 3 recall questions
- [ ] Every concept has at least 2 compare questions
- [ ] Every concept has at least 2 classify questions
- [ ] Every concept has at least 2 scenario questions
- [ ] Concepts with genuine edge cases have at least 1 exception question
- [ ] Every concept has at least 1 reason question
- [ ] Total questions per topic: 80-100
- [ ] Questions are distributed across all three difficulty tiers
- [ ] No two questions test the exact same thing the exact same way
- [ ] Scenario questions use age-appropriate, relatable contexts (school, zoo, kitchen, playground)
- [ ] Exception questions target real misconceptions (not obscure trivia)
- [ ] Reason question options present plausible alternative explanations, not obviously wrong ones

---

## Applying This Framework Across Subjects

This taxonomy is universal. Here are examples for non-biology subjects:

### Mathematics (Fractions, Class 5)

| Level | Example |
|-------|---------|
| recall | "What is 3/4 called — proper or improper fraction?" |
| compare | "How is a proper fraction different from an improper fraction?" |
| classify | "Classify these as proper or improper: 5/3, 2/7, 8/8" |
| scenario | "Riya ate 2/8 of a pizza and Amit ate 3/8. Who ate more?" |
| exception | "Is 7/7 a proper fraction, improper fraction, or whole number?" |
| reason | "Why is 5/3 called an improper fraction?" |

### Chemistry (States of Matter, Class 6)

| Level | Example |
|-------|---------|
| recall | "What are the three states of matter?" |
| compare | "How does the arrangement of molecules differ in solids vs gases?" |
| classify | "Ice is heated and turns to water. What type of change is this?" |
| scenario | "When Priya left a glass of water in the sun, the water level dropped. What happened?" |
| exception | "Is glass a solid or a liquid? Explain." |
| reason | "Why does a gas fill the entire container while a liquid settles at the bottom?" |

### Physics (Light, Class 7)

| Level | Example |
|-------|---------|
| recall | "The bouncing back of light from a surface is called ___" |
| compare | "How is regular reflection different from diffuse reflection?" |
| classify | "A spoon in a glass of water appears bent. This is due to ___" |
| scenario | "Amit is standing in front of a plane mirror. His image appears ___ cm behind the mirror if he is 50 cm away." |
| exception | "Can you see your reflection in a rough wall? Why or why not?" |
| reason | "Why does a pencil appear bent when partially dipped in water?" |

---

## Implementation Notes

### Question JSON Schema (Updated)

```json
{
  "question_id": "T10.01.Q058",
  "type": "mcq",
  "concept_id": "T10.01.C04",
  "difficulty": "application",
  "cognitive_level": "compare",
  "question_text": "How does Class Reptilia differ from Class Mammalia in the number of heart chambers?",
  "options": [
    {"id": "A", "text": "Reptilia has 2 chambers, Mammalia has 3"},
    {"id": "B", "text": "Reptilia has 3 chambers, Mammalia has 4"},
    {"id": "C", "text": "Both have 4 chambers"},
    {"id": "D", "text": "Reptilia has 4 chambers, Mammalia has 3"}
  ],
  "correct_answer": "B",
  "explanation_correct": "Reptiles have a three-chambered heart (with the exception of crocodiles which have four), while all mammals have a four-chambered heart. This difference in heart structure relates to their different metabolic needs — mammals are warm-blooded and need more efficient oxygen circulation.",
  "explanation_incorrect": "..."
}
```

### Selection Algorithm Additions

1. **Question-level recency penalty** — query recent session_answers, penalize recently-seen questions
2. **Cognitive variety balancing** — within a 10-question session, ensure at least 2-3 different cognitive levels are represented
3. **No more than 3 consecutive questions at the same cognitive level** — interleave for engagement

### Database Migration

- Add `cognitive_level VARCHAR(20)` to `questions` table with CHECK constraint for valid values
- Default existing questions to `'recall'`
- Add index on `(topic_id_str, cognitive_level)` for efficient pool building

---

## Versioning

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-17 | Initial framework — cognitive level taxonomy, question authoring guidelines, selection algorithm design |

---

*This framework was developed by analyzing actual school worksheets and teaching materials against CoolSCool's existing question bank. The gap analysis revealed that schools test across multiple cognitive dimensions while the app primarily tested recall. This framework closes that gap.*
