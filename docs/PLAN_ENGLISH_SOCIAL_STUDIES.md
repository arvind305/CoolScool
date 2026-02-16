# Phase 6 & 7: English and Social Studies Implementation Plan
# ICSE + CBSE Boards, Classes 1-12

**Created**: 2026-02-16
**Status**: Draft — awaiting approval
**Estimated total new questions**: ~33,800
**Estimated total new CAM files**: 72
**Estimated total new question files**: ~720
**Estimated API cost (explanation generation)**: ~$10-12

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-work (Schema, Config, Seed Scripts)](#pre-work)
3. [Phase 6: English (ICSE + CBSE)](#phase-6-english)
4. [Phase 7: Social Studies (ICSE + CBSE)](#phase-7-social-studies)
5. [Execution Order and Dependencies](#execution-order)
6. [Seed Script Changes](#seed-script-changes)
7. [Sub-phase Breakdown for Parallel Agents](#sub-phase-breakdown)
8. [Question Count Summary](#question-count-summary)
9. [Risk and Mitigation](#risk-and-mitigation)

---

## 1. Overview

This plan covers the implementation of two new subjects — **English** and **Social Studies** — for **both ICSE and CBSE boards** across Classes 1-12.

### Current Platform State

| Board | Mathematics | Science/EVS | Physics | Chemistry | Biology | Total |
|-------|-------------|-------------|---------|-----------|---------|-------|
| ICSE  | 19,807      | 3,192       | 4,370   | 4,636     | 5,091   | 37,096 |
| CBSE  | 10,300      | 3,100       | 2,600   | 2,600     | 3,450   | 22,050 |
| **Total** | **30,107** | **6,292** | **6,970** | **7,236** | **8,541** | **59,146** |

### Existing Infrastructure

- **Frontend config**: `english` and `social_studies` entries exist with `status: 'coming_soon'`
- **CAM schema**: Subject enum includes `"English"`, `"History"`, `"Geography"`, `"Civics"`, `"Social Studies"` — needs `"Political Science"` added
- **DB schema**: `question_type` CHECK constraint supports `mcq`, `fill_blank`, `true_false`, `match`, `ordering`
- **DB curricula table**: Supports multi-board via `UNIQUE(board, class_level, subject)`

### What This Plan Adds

| Component | Count |
|-----------|-------|
| New CAM files | 72 |
| New question files | ~720 |
| New questions | ~33,800 |
| New question directories | ~48 |
| **New platform total** | **~92,946 questions** |

---

## 2. Pre-work (Schema, Config, Seed Scripts)

These changes must be completed BEFORE any content creation begins.

### 2A. CAM Schema Update (`cam/schema/cam-schema.json`)

Add `"Political Science"` to the subject enum:
```
Current:  [..., "Civics", "Social Studies"]
Updated:  [..., "Civics", "Social Studies", "Political Science"]
```

### 2B. Frontend Config Update (`coolscool-web/src/lib/curriculum/config.ts`)

Add new subject entries for Social Studies sub-subjects:

```typescript
history: {
  id: 'history',
  name: 'History',
  icon: '📜',
  color: '#b45309',
  status: 'live' as const,
  classRange: [6, 12] as const,
},
geography: {
  id: 'geography',
  name: 'Geography',
  icon: '🌍',
  color: '#0d9488',
  status: 'live' as const,
  classRange: [6, 12] as const,
},
civics: {
  id: 'civics',
  name: 'Civics',
  icon: '⚖️',
  color: '#7c3aed',
  status: 'live' as const,
  classRange: [6, 10] as const,
},
political_science: {
  id: 'political_science',
  name: 'Political Science',
  icon: '🏛️',
  color: '#6366f1',
  status: 'live' as const,
  classRange: [11, 12] as const,
},
```

Update existing entries:
- `english`: Add `classRange: [1, 12]`, change status to `'live'`
- `social_studies`: Add `classRange: [1, 5]`, change status to `'live'`

### 2C. No DB Migration Needed

The `curricula` table uses `VARCHAR(50)` for subject — no migration required.

---

## 3. Phase 6: English (ICSE + CBSE)

### 3.1 Board-Specific Syllabus Alignment

| Board | Syllabus Source | Key Differences |
|-------|----------------|-----------------|
| **ICSE** | CISCE English Language + Literature | More emphasis on literature, formal grammar, composition. Letter/essay writing from Class 5. |
| **CBSE** | NCERT English (Marigold, Honeysuckle, Honeycomb, etc.) | Activity-based for lower classes. More creative writing emphasis in senior classes. |

### 3.2 Topic Breakdown by Class Range

#### Classes 1-2 (Foundation)

| Theme | Topics |
|-------|--------|
| T01: Alphabet & Phonics | Letter recognition, phonics, blending sounds |
| T02: Vocabulary Building | Sight words, naming words, action words, rhyming |
| T03: Simple Sentences | Sentence awareness, capital letters, full stops |
| T04: Comprehension | Picture-based reading, short passages (3-4 lines) |

**Topics per class**: ~4 themes, ~8-10 topics | **Questions per class**: ~400

#### Classes 3-4 (Building Blocks)

| Theme | Topics |
|-------|--------|
| T01: Grammar Foundations | Nouns (common/proper), verbs, adjectives, pronouns |
| T02: Sentence Structure | Statement, question, exclamation, command; subject-predicate |
| T03: Vocabulary & Spelling | Synonyms, antonyms, homophones, compound words |
| T04: Punctuation | Full stops, question marks, commas, apostrophes |
| T05: Comprehension | Short passages with factual questions |
| T06: Creative Writing | Picture composition, short paragraphs |

**Topics per class**: ~6 themes, ~12-14 topics | **Questions per class**: ~600

#### Classes 5-6 (Intermediate)

| Theme | Topics |
|-------|--------|
| T01: Parts of Speech | All 8 parts of speech, articles, prepositions |
| T02: Tenses | Simple present/past/future, continuous tenses |
| T03: Sentence Construction | Simple/compound sentences, conjunctions |
| T04: Vocabulary | Prefixes, suffixes, idioms (intro), one-word substitutions |
| T05: Comprehension | Unseen passages (factual + inferential) |
| T06: Composition | Letter writing (informal), paragraph writing, notice |
| T07: Spelling & Dictation | Commonly misspelled words, silent letters |

**Topics per class**: ~7 themes, ~16-18 topics | **Questions per class**: ~800

#### Classes 7-8 (Advanced Intermediate)

| Theme | Topics |
|-------|--------|
| T01: Advanced Grammar | All 12 tense forms, modals, subject-verb agreement |
| T02: Voice & Speech | Active/passive voice, direct/indirect speech |
| T03: Sentence Transformation | Affirmative↔negative, assertive↔interrogative |
| T04: Vocabulary Building | Idioms & phrases, proverbs, phrasal verbs |
| T05: Comprehension | Unseen passages (discursive + literary), note-making |
| T06: Composition | Formal/informal letters, essay, dialogue writing |
| T07: Poetry | Figures of speech (intro), rhyme scheme |
| T08: Error Correction | Editing, omission, sentence reordering |

**Topics per class**: ~8 themes, ~18-20 topics | **Questions per class**: ~900

#### Classes 9-10 (Board Exam Preparation)

| Theme | Topics |
|-------|--------|
| T01: Advanced Grammar | Complex tenses, conditionals, reported speech (advanced) |
| T02: Sentence Transformation | All transformation types, synthesis |
| T03: Figures of Speech | Simile, metaphor, personification, alliteration, hyperbole, irony |
| T04: Comprehension | Board-format unseen passages (factual, discursive, literary) |
| T05: Composition | Formal letters, email, essay, speech, debate, report |
| T06: Precis & Note-Making | Precis writing, note-making from passages |
| T07: Vocabulary | Advanced idioms, foreign phrases |
| T08: Poetry Appreciation | Detailed poem analysis, themes, imagery |
| T09: Error Correction | Board exam format editing and gap filling |

**Topics per class**: ~9 themes, ~20-22 topics | **Questions per class**: ~1,000

#### Classes 11-12 (Senior Secondary)

| Theme | Topics |
|-------|--------|
| T01: Advanced Grammar | All grammar at advanced level, stylistic usage |
| T02: Comprehension | Long unseen passages, critical analysis |
| T03: Composition | Argumentative essays, speeches, proposals, reports |
| T04: Rhetoric & Style | Tone, register, persuasive writing |
| T05: Literary Devices | Extended metaphor, allegory, satire |
| T06: Critical Reading | Author intent, bias detection, comparative analysis |

**Topics per class**: ~6 themes, ~14-16 topics | **Questions per class**: ~700

### 3.3 Question Type Distribution for English

| Question Type | % | Best Used For |
|---------------|---|---------------|
| `mcq` | 45% | Grammar rules, vocabulary, comprehension, literary devices |
| `fill_blank` | 25% | Tense exercises, prepositions, articles, cloze passages |
| `true_false` | 10% | Grammar rule validation, fact-checking in passages |
| `ordering` | 10% | Sentence rearrangement, paragraph ordering |
| `match` | 10% | Synonyms↔antonyms, idioms↔meanings, words↔definitions |

### 3.4 File Naming Conventions

| Component | ICSE Pattern | CBSE Pattern |
|-----------|-------------|--------------|
| CAM files | `cam/data/icse-class{N}-english-cam.json` | `cam/data/cbse-class{N}-english-cam.json` |
| Question dirs | `questions/data/class{N}-english/` | `questions/data/cbse-class{N}-english/` |
| Question files | `T01.01-alphabet-phonics.json` | Same naming within dirs |

### 3.5 Estimated Question Counts — English

| Class Range | Topics/Class (avg) | Q/Class | ICSE Total | CBSE Total |
|------------|-------------------|---------|------------|------------|
| 1-2 | 8 | 400 | 800 | 800 |
| 3-4 | 12 | 600 | 1,200 | 1,200 |
| 5-6 | 16 | 800 | 1,600 | 1,600 |
| 7-8 | 18 | 900 | 1,800 | 1,800 |
| 9-10 | 20 | 1,000 | 2,000 | 2,000 |
| 11-12 | 14 | 700 | 1,400 | 1,400 |
| **Total** | | | **8,800** | **8,800** |

**Grand total English: ~17,600 questions** | **24 CAM files** | **~360 question files**

### 3.6 Sub-phases for English

| Sub-phase | Scope | Questions | CAM Files | API Cost |
|-----------|-------|-----------|-----------|----------|
| **6A** | ICSE English Classes 1-5 | ~3,200 | 5 | ~$1.00 |
| **6B** | ICSE English Classes 6-10 | ~4,200 | 5 | ~$1.30 |
| **6C** | ICSE English Classes 11-12 | ~1,400 | 2 | ~$0.45 |
| **6D** | CBSE English Classes 1-5 | ~3,200 | 5 | ~$1.00 |
| **6E** | CBSE English Classes 6-10 | ~4,200 | 5 | ~$1.30 |
| **6F** | CBSE English Classes 11-12 | ~1,400 | 2 | ~$0.45 |
| **Total** | | **~17,600** | **24** | **~$5.50** |

---

## 4. Phase 7: Social Studies (ICSE + CBSE)

### 4.1 Subject Structure — Critical Differences

Social Studies splits into sub-subjects at different class levels, and the split differs between boards:

| Classes | ICSE | CBSE |
|---------|------|------|
| 1-2 | Social Studies (combined) | No separate subject (covered by EVS) |
| 3-5 | Social Studies (combined) | Social Studies (combined) |
| 6-10 | History + Geography + Civics (3 separate) | History + Geography + Civics (3 separate) |
| 11-12 | History + Geography + Political Science (3 separate) | History + Geography + Political Science (3 separate) |

**Key**: CBSE Classes 1-2 skip Social Studies (EVS covers it). ICSE Classes 1-2 have separate Social Studies.

### 4.2 Topic Breakdown

#### ICSE Classes 1-2: Social Studies (Combined)

| Theme | Topics |
|-------|--------|
| T01: My Family & Home | Types of families, family members, family tree |
| T02: My School | School rules, people in school |
| T03: My Neighbourhood | Community helpers, places, transport |
| T04: Our Country India | National symbols, festivals, cultural diversity |
| T05: Weather & Seasons | Types of weather, seasons, clothing |

**Topics per class**: ~5 themes, ~8-10 topics | **Questions per class**: ~400

#### Classes 3-5: Social Studies (Combined) — Both boards

| Theme | Topics |
|-------|--------|
| T01: India — Our Country | States & capitals, physical features, maps |
| T02: History of India | Freedom fighters, ancient civilizations, important events |
| T03: Geography Basics | Landforms, water bodies, directions, maps & globes |
| T04: Government & Civics | Local government, democracy basics, rights & duties |
| T05: Culture & Heritage | Festivals, monuments, languages |
| T06: Environment & Resources | Natural resources, conservation |

**Topics per class**: ~6 themes, ~12-14 topics | **Questions per class**: ~600

#### Classes 6-8: History

| Theme (ICSE) | Theme (CBSE) |
|--------------|--------------|
| T01: Ancient Civilizations (Indus Valley, Vedic) | T01: Early Humans & First Farmers |
| T02: Ancient Empires (Maurya, Gupta) | T02: Early States & Empires |
| T03: Medieval India (Sultanate, Mughal) | T03: Medieval India |
| T04: Modern India (British Rule, Reform) | T04: Our Past (Colonial period) |
| T05: Indian National Movement | T05: Indian National Movement |
| T06: World History | T06: Modern World |

**Topics per class**: ~6 themes, ~10-12 topics | **Questions per class**: ~500

#### Classes 6-8: Geography

| Theme | Topics |
|-------|--------|
| T01: The Earth | Earth's shape, movements, grid system |
| T02: Maps & Globes | Types of maps, scale, symbols |
| T03: Landforms | Mountains, plateaus, plains, coastal |
| T04: Climate & Weather | Factors, zones, India's climate |
| T05: Natural Resources | Water, forests, minerals |
| T06: Agriculture & Industries | Types, distribution |

**Topics per class**: ~6 themes, ~10-12 topics | **Questions per class**: ~500

#### Classes 6-8: Civics

| Theme | Topics |
|-------|--------|
| T01: The Indian Constitution | Preamble, fundamental rights |
| T02: Government Structure | Union, State, Local bodies |
| T03: Democracy & Elections | Electoral process, voting |
| T04: Judiciary | Courts, justice system |
| T05: Rights & Duties | Fundamental rights & duties |

**Topics per class**: ~5 themes, ~8-10 topics | **Questions per class**: ~400

#### Classes 9-10: History (Board Exam Level)

| Theme (ICSE) | Theme (CBSE) |
|--------------|--------------|
| T01: World War I & II | T01: French Revolution, Russian Revolution |
| T02: Indian Independence Movement (detailed) | T02: Indian National Movement (detailed) |
| T03: Post-Independence India | T03: Nationalism in India |
| T04: Cold War & Decolonization | T04: Age of Industrialization |
| T05: Contemporary World | T05: Print Culture, Novels |

**Topics per class**: ~5-6 themes, ~12-14 topics | **Questions per class**: ~600

#### Classes 9-10: Geography (Board Exam Level)

| Theme | Topics |
|-------|--------|
| T01: India — Physical Features | Mountains, rivers, plains |
| T02: Climate of India | Monsoon, seasons |
| T03: Natural Vegetation & Wildlife | Forests, wildlife |
| T04: Water Resources | Rivers, dams, irrigation |
| T05: Agriculture | Types, crops, green revolution |
| T06: Industries | Types, distribution, industrial regions |
| T07: Population | Distribution, density, growth |

**Topics per class**: ~7 themes, ~14-16 topics | **Questions per class**: ~700

#### Classes 9-10: Civics (Board Exam Level)

| Theme (ICSE) | Theme (CBSE) |
|--------------|--------------|
| T01: Indian Constitution (detailed) | T01: Democracy, Constitutional Design |
| T02: Parliament & Law-Making | T02: Electoral Politics |
| T03: Judiciary (detailed) | T03: Working of Institutions |
| T04: Local Government | T04: Democratic Rights |
| T05: Rights & Duties | T05: Outcomes of Democracy |

**Topics per class**: ~5 themes, ~10-12 topics | **Questions per class**: ~500

#### Classes 11-12: History, Geography, Political Science

**History**: ~5 themes, ~10-12 topics/class, ~500 questions/class
**Geography**: ~4 themes, ~10-12 topics/class, ~500 questions/class
**Political Science**: ~4 themes, ~8-10 topics/class, ~400 questions/class

### 4.3 Question Type Distribution for Social Studies

| Question Type | % | Best Used For |
|---------------|---|---------------|
| `mcq` | 50% | Facts, dates, capitals, events, definitions |
| `true_false` | 15% | Historical facts, geographical features, constitutional provisions |
| `fill_blank` | 15% | Names, dates, places, definitions |
| `match` | 10% | Events↔dates, countries↔capitals, leaders↔movements |
| `ordering` | 10% | Chronological ordering of events/empires |

### 4.4 File Naming Conventions

| Scope | ICSE Pattern | CBSE Pattern |
|-------|-------------|--------------|
| Classes 1-5 (combined) | `class{N}-social-studies/` | `cbse-class{N}-social-studies/` |
| Classes 6+ History | `class{N}-history/` | `cbse-class{N}-history/` |
| Classes 6+ Geography | `class{N}-geography/` | `cbse-class{N}-geography/` |
| Classes 6-10 Civics | `class{N}-civics/` | `cbse-class{N}-civics/` |
| Classes 11-12 Pol. Sci. | `class{N}-political-science/` | `cbse-class{N}-political-science/` |

CAM files follow the same pattern: `{board}-class{N}-{subject}-cam.json`

### 4.5 Estimated Question Counts — Social Studies

**ICSE:**

| Scope | Topics/Class | Q/Class | Classes | Subtotal |
|-------|-------------|---------|---------|----------|
| Classes 1-2 Social Studies | 8 | 400 | 2 | 800 |
| Classes 3-5 Social Studies | 12 | 600 | 3 | 1,800 |
| Classes 6-8 History | 10 | 500 | 3 | 1,500 |
| Classes 6-8 Geography | 10 | 500 | 3 | 1,500 |
| Classes 6-8 Civics | 8 | 400 | 3 | 1,200 |
| Classes 9-10 History | 12 | 600 | 2 | 1,200 |
| Classes 9-10 Geography | 14 | 700 | 2 | 1,400 |
| Classes 9-10 Civics | 10 | 500 | 2 | 1,000 |
| Classes 11-12 History | 10 | 500 | 2 | 1,000 |
| Classes 11-12 Geography | 10 | 500 | 2 | 1,000 |
| Classes 11-12 Pol. Sci. | 8 | 400 | 2 | 800 |
| **ICSE Total** | | | | **~13,200** |

**CBSE** (no Classes 1-2 — covered by EVS):

| Scope | Subtotal |
|-------|----------|
| Classes 3-5 Social Studies | 1,800 |
| Classes 6-8 History + Geography + Civics | 4,200 |
| Classes 9-10 History + Geography + Civics | 3,600 |
| Classes 11-12 History + Geography + Pol. Sci. | 2,800 |
| **CBSE Total** | **~12,400** |

**Grand total Social Studies: ~25,600 questions** | **~48 CAM files** | **~360 question files**

Wait — this is higher than the initial English estimate, so let me recalibrate to keep it realistic. Using 50 questions per topic as the standard:

**Revised totals:**

| Board | Social Studies Total |
|-------|---------------------|
| ICSE | ~8,100 |
| CBSE | ~8,100 |
| **Grand Total** | **~16,200** |

### 4.6 CAM File Count — Social Studies

| Scope | ICSE | CBSE |
|-------|------|------|
| Classes 1-2 (combined SS) | 2 | 0 |
| Classes 3-5 (combined SS) | 3 | 3 |
| Classes 6-10 History | 5 | 5 |
| Classes 6-10 Geography | 5 | 5 |
| Classes 6-10 Civics | 5 | 5 |
| Classes 11-12 History | 2 | 2 |
| Classes 11-12 Geography | 2 | 2 |
| Classes 11-12 Pol. Sci. | 2 | 2 |
| **Total** | **26** | **22** |

**Grand total Social Studies CAM files: 48**

### 4.7 Sub-phases for Social Studies

| Sub-phase | Scope | Questions | CAM Files | API Cost |
|-----------|-------|-----------|-----------|----------|
| **7A** | ICSE Social Studies Classes 1-5 | ~2,000 | 5 | ~$0.65 |
| **7B** | ICSE History+Geography+Civics Classes 6-8 | ~2,550 | 9 | ~$0.80 |
| **7C** | ICSE History+Geography+Civics Classes 9-10 | ~2,100 | 6 | ~$0.65 |
| **7D** | ICSE History+Geography+Pol.Sci Classes 11-12 | ~1,700 | 6 | ~$0.55 |
| **7E** | CBSE Social Studies Classes 3-5 | ~1,500 | 3 | ~$0.50 |
| **7F** | CBSE History+Geography+Civics Classes 6-8 | ~2,550 | 9 | ~$0.80 |
| **7G** | CBSE History+Geography+Civics Classes 9-10 | ~2,100 | 6 | ~$0.65 |
| **7H** | CBSE History+Geography+Pol.Sci Classes 11-12 | ~1,700 | 6 | ~$0.55 |
| **Total** | | **~16,200** | **48** | **~$5.15** |

---

## 5. Execution Order and Dependencies

```
Pre-work (required before any content)
  ├── Update CAM schema (add "Political Science")
  ├── Update frontend config (add history/geography/civics/political_science)
  └── Extend seed scripts for new subjects

Phase 6: English (independent of Phase 7)
  ├── 6A: ICSE English Classes 1-5     ┐
  ├── 6B: ICSE English Classes 6-10    ├── Can all run in parallel
  ├── 6C: ICSE English Classes 11-12   ┘
  ├── 6D: CBSE English Classes 1-5     ┐
  ├── 6E: CBSE English Classes 6-10    ├── Can all run in parallel
  ├── 6F: CBSE English Classes 11-12   ┘
  └── Mark English as 'live', seed to DB, commit

Phase 7: Social Studies (independent of Phase 6)
  ├── 7A: ICSE Social Studies Classes 1-5            ┐
  ├── 7B: ICSE History+Geography+Civics Classes 6-8  ├── Can run in parallel
  ├── 7C: ICSE H+G+C Classes 9-10                   │
  ├── 7D: ICSE H+G+PS Classes 11-12                 ┘
  ├── 7E: CBSE Social Studies Classes 3-5            ┐
  ├── 7F: CBSE H+G+C Classes 6-8                    ├── Can run in parallel
  ├── 7G: CBSE H+G+C Classes 9-10                   │
  ├── 7H: CBSE H+G+PS Classes 11-12                 ┘
  └── Mark Social Studies + sub-subjects as 'live', seed to DB, commit
```

### Parallelism

- Phase 6 and Phase 7 are **fully independent** — can run simultaneously
- Within each phase, ICSE and CBSE are independent
- Within each sub-phase, each class x subject is independent
- **Maximum agent parallelism per sub-phase**: up to 10 agents

---

## 6. Seed Script Changes

### Extend `seed-cbse-all.ts`

Add English and Social Studies entries to the curricula array:

```typescript
// English: Classes 1-12
for (let cls = 1; cls <= 12; cls++) {
  curricula.push({
    camFile: path.join(rootDir, `cam/data/cbse-class${cls}-english-cam.json`),
    questionsDir: path.join(rootDir, `questions/data/cbse-class${cls}-english`),
  });
}

// Social Studies: Classes 3-5 (combined)
for (let cls = 3; cls <= 5; cls++) {
  curricula.push({
    camFile: path.join(rootDir, `cam/data/cbse-class${cls}-social-studies-cam.json`),
    questionsDir: path.join(rootDir, `questions/data/cbse-class${cls}-social-studies`),
  });
}

// History, Geography, Civics: Classes 6-10
for (let cls = 6; cls <= 10; cls++) {
  for (const subj of ['history', 'geography', 'civics']) {
    curricula.push({ ... });
  }
}

// History, Geography, Political Science: Classes 11-12
for (let cls = 11; cls <= 12; cls++) {
  for (const subj of ['history', 'geography', 'political-science']) {
    curricula.push({ ... });
  }
}
```

### Create `seed-icse-all.ts`

Similar to `seed-cbse-all.ts` but for ICSE content (including English and Social Studies).

---

## 7. Sub-phase Breakdown for Parallel Agents

### Example: Phase 6A (ICSE English Classes 1-5)

| Agent | Task | Output |
|-------|------|--------|
| Agent 1 | ICSE Class 1 English CAM + Questions | 1 CAM + ~8 question files |
| Agent 2 | ICSE Class 2 English CAM + Questions | 1 CAM + ~8 question files |
| Agent 3 | ICSE Class 3 English CAM + Questions | 1 CAM + ~12 question files |
| Agent 4 | ICSE Class 4 English CAM + Questions | 1 CAM + ~12 question files |
| Agent 5 | ICSE Class 5 English CAM + Questions | 1 CAM + ~16 question files |
| Validator | Verify JSON, check counts, no duplicate IDs | Validation report |

### Example: Phase 7B (ICSE History+Geography+Civics Classes 6-8)

| Agent | Task | Output |
|-------|------|--------|
| Agent 1-3 | Class 6/7/8 History | 3 CAMs + ~30 question files |
| Agent 4-6 | Class 6/7/8 Geography | 3 CAMs + ~30 question files |
| Agent 7-9 | Class 6/7/8 Civics | 3 CAMs + ~24 question files |
| Validator | Verify all JSON files | Validation report |

---

## 8. Question Count Summary

### Phase 6: English

| Board | Classes 1-5 | Classes 6-10 | Classes 11-12 | Total |
|-------|------------|-------------|---------------|-------|
| ICSE | 3,200 | 4,200 | 1,400 | **8,800** |
| CBSE | 3,200 | 4,200 | 1,400 | **8,800** |
| **Total** | **6,400** | **8,400** | **2,800** | **17,600** |

### Phase 7: Social Studies

| Board | Classes 1-5 | Classes 6-10 | Classes 11-12 | Total |
|-------|------------|-------------|---------------|-------|
| ICSE | 2,600 | 4,650 | 1,700 | **8,950** |
| CBSE | 1,500 | 4,050 | 1,700 | **7,250** |
| **Total** | **4,100** | **8,700** | **3,400** | **16,200** |

### Grand Total — All Phases

| Phase | Questions | CAM Files | Question Files | API Cost |
|-------|-----------|-----------|----------------|----------|
| Phase 6 (English) | ~17,600 | 24 | ~360 | ~$5.50 |
| Phase 7 (Social Studies) | ~16,200 | 48 | ~360 | ~$5.15 |
| **Grand Total** | **~33,800** | **72** | **~720** | **~$10.65** |

### After Implementation — Full Platform

| Category | Current | Added | New Total |
|----------|---------|-------|-----------|
| Questions | 59,146 | 33,800 | **~92,946** |
| Subjects | 7 unique | +6 new | **13** |
| CAM files | ~50 | +72 | **~122** |
| Curricula (DB) | 76 | +~70 | **~146** |

---

## 9. Risk and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| CAM schema missing "Political Science" | Validation fails for 11-12 | Add to enum in pre-work |
| Frontend doesn't handle split SS subjects | Users can't browse History/Geography/Civics | Add dedicated subject entries with classRange |
| CBSE Classes 1-2 no Social Studies | Gap in subject list | Correct — EVS covers it. No action needed. |
| `match` question type never tested in prod | Rendering bugs | Test match rendering in QuestionDisplay before bulk creation |
| ~34K new questions may hit Neon limits | Insert failures | Seed in batches per sub-phase |
| English `fill_blank` with `___` placeholder | May not render correctly | Verify QuestionDisplay handles `___` in question_text |

### Pre-flight Checks (Before Starting)

1. Verify `match` question type renders correctly in quiz UI
2. Verify `fill_blank` with `___` renders correctly
3. Confirm Neon DB can accommodate ~34K additional questions
4. Test one English CAM + question file end-to-end (create, seed, quiz) before bulk generation
5. Verify the browse page correctly shows/hides subjects by classRange
