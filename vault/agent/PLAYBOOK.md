---
type: Playbook
title: PLAYBOOK
description: Vault concept (agent/PLAYBOOK.md).
tags: [alt-med, okf]
generated:
  by: process:grok-alt-med-vault
  at: 2026-09-09T03:13:00Z
status: draft
stale_after: 2027-09-09
sources:
  - id: boericke-1927-scan
    resource: attachments/_OceanofPDF.com_POCKET_MANUAL_OF_HOMEOPATHIC_MATERIA_MEDICA_AND_REPERTORY_-_William_Boericke.pdf
    title: Pocket Manual of Homoeopathic Materia Medica and Repertory (9th ed. reprint scan)
    author: human:William Boericke
    last_modified: 1927-01-01T00:00:00Z
  - id: vault-curation
    resource: boericke-vault/
    title: Agent vault curation (structure, playbooks, indexes)
    author: process:grok-alt-med-vault
    last_modified: 2026-09-09T03:13:00Z
---

# Agent playbook — diagnosis support from Boericke

Read [[agent/DISCLAIMER]] first. Quote or paraphrase it at the top of any recommendation.

## Goal

Turn a free-text case into:

1. A structured **totality** (mind, generals, particulars, modalities, causation).
2. A short list of **similimum candidates** with evidence quotes from vault notes.
3. Differentiation using [[relationships/GRAPH]].
4. Open questions if the picture is incomplete.

## Interview order (Kent / Boericke practical)

Ask only what is missing. Prefer the patient’s own words.

1. **Causation / onset** — fright, dry cold wind, checked sweat, grief, suppressed eruption, injury, after eating, after operation.
2. **Mind** — fear, restlessness, indifference, weeping, irritability, company desire/aversion.
3. **Generals** — heat/cold, thirst, sweat, time aggravation, side, weather, motion vs rest.
4. **Particulars** — location, sensation (burning, stitching, lump, bearing-down), discharge character, concomitants.
5. **Modalities** — worse / better that change the whole case.
6. **Strange, rare, peculiar** — Boericke keynotes beat common disease labels.

## Scoring (simple, explainable)

For each candidate remedy `R`:

- +3 characteristic keynote match (starred `*` paragraphs in Boericke / Keynotes index)
- +2 exact modality match
- +2 mind match
- +1 common regional symptom
- −2 strong contradictory general (e.g. thirsty + chilly vs thirsty + burning restless [[Arsenicum album]] is ok; thirstless + hot + changeable points [[Pulsatilla pratensis]])
- −3 missing the remedy’s *sine qua non* when that is well-described

Present top 3–5 with scores and **quoted phrases** from the remedy note.

## Recommendation shape

```
Disclaimer
Totality (bullet reconstruction)
Candidates (ranked)
  - Why this remedy (quotes + links)
  - Why not the next one (compare)
Gaps / questions
If they seek a potency: quote Boericke dose line + “suggestive only”
Red-flag check
```

## When not to pick a remedy

- Picture is only a disease name (“I have migraine”) with no modalities.
- Conflicting keynotes from two incompatible polychrests and no tie-break.
- User wants treatment of a condition that needs imaging, labs, or emergency care.

Then: list *possible* remedies as study notes, do not crown a similimum.

## Cross-walk files

- Fast patterns: [[indexes/KEYNOTES]]
- Region hunt: [[indexes/BY-SYSTEM]]
- Full roster: [[indexes/FULL-REMEDY-LIST]]
- Written notes: [[indexes/REMEDY-INDEX]]
- Compare/complement: [[relationships/GRAPH]]

## Tono (obligatorio)
Leer [[agent/TONO]] (o el TONO de este dominio si existe).
Hablar como **asistente**. Dar **opciones**, no una orden.
Cerrar: el médico revisa las opciones **junto con el paciente**.

## Respuesta breve + fuente
Máximo 2 frases de marco + lista de opciones.
Cada opción o el cierre debe citar **nota del vault + libro/capítulo/página**.
El médico usa esa cita para leer el original con el paciente.
Plantilla: [[agent/TONO]]
