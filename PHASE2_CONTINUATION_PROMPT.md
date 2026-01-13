# Phase 2 Continuation Prompt

Copy and paste this prompt into a new Claude Code thread to continue with Phase 2.

---

## PROMPT START

```
This document (unified_north_star_build_constitution_pressure_free_curriculum_practice_app_mvp_master_document.md) is the governing constitution for a pressure-free curriculum practice app. You must treat it as immutable.

## Context

Phase 1 (CAM Ingestion & Validation) has been completed. The following artifacts exist:

**CAM Files:**
- `cam/schema/cam-schema.json` - JSON Schema for CAM structure
- `cam/data/icse-class5-mathematics-cam.json` - Complete CAM with 10 themes, 32 topics, 163 concepts
- `cam/validation/cam-validator.js` - Validation script
- `cam/CAM_PHASE1_SUMMARY.md` - Phase 1 summary report

**CAM Statistics:**
- Themes: 10
- Topics: 32
- Concepts: 163
- All topics have explicit in_scope and out_of_scope boundaries

## Your Task

Implement **Phase 2: Question Bank Creation** for ICSE Class 5 Mathematics.

Before starting:
1. Read the North Star document: `unified_north_star_build_constitution_pressure_free_curriculum_practice_app_mvp_master_document.md`
2. Read the CAM data: `cam/data/icse-class5-mathematics-cam.json`
3. Read the Phase 1 summary: `cam/CAM_PHASE1_SUMMARY.md`

Phase 2 must include:
1. **Question Schema Design** - Structure for questions aligned to CAM
2. **Question Bank Creation** - Questions for each concept within boundaries
3. **Difficulty Level Assignment** - Map questions to familiarity/application/exam_style
4. **Canonical Explanations** - Author explanations per North Star §10
5. **Question Validation** - Ensure all questions comply with CAM boundaries

**Critical Requirements (from North Star):**
- No trick questions (§6)
- No multi-concept questions (§6)
- Finite question set per topic (§7)
- No live generation of answers (§11)
- Explanations: 2-4 sentences, no teaching, no worked steps (§10.3)
- All content must be CAM-validated (§11)

At the end of Phase 2:
1. Update the North Star document with Phase 2 completion status
2. Generate a continuation prompt for Phase 3

Do not propose features. Do not violate the North Star document. Implement Phase 2 only.
```

## PROMPT END

---

**Generated:** 2026-01-07
**For:** Phase 2 - Question Bank Creation
**Previous Phase:** Phase 1 - CAM Ingestion & Validation (COMPLETE)
