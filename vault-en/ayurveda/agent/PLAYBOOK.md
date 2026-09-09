---
language: en
type: Playbook
title: Playbook ayurveda
description: "Dosha grosero + objetivo + planta del tomo."
tags: [alt-med, okf, ayurveda]
generated:
  by: process:grok-alt-med-vault
  at: 2026-09-09T03:40:00Z
status: draft
stale_after: 2027-09-09
sources:
  - id: amalraj-rsc-ayurveda-2023
    resource: attachments/_OceanofPDF.com_Chemistry_Biological_Activities_and_Therapeutic_Applications_of_Medicinal_Plants_in_Ayurveda_-_Augustine_Amalraj.pdf
    title: "Chemistry, Biological Activities and Therapeutic Applications of Medicinal Plants in Ayurveda (Amalraj, Kuttappan, Varma eds., RSC 2023)"
    author: human:Augustine-Amalraj
    last_modified: 2023-01-01T00:00:00Z
  - id: vault-curation
    resource: boericke-vault/ayurveda/
    title: Agent plant catalog (chapter map + original short notes)
    author: process:grok-alt-med-vault
    last_modified: 2026-09-09T03:40:00Z
---

# Playbook

1. Disclaimer.
2. Queja y constitucion grosera (vata sequedad-movilidad, pitta calor, kapha peso-frio).
3. [[ayurveda/indexes/POR-OBJETIVO]]
4. 3–5 plantas del tomo con *por qué el capítulo las cita*, no receta.
5. Advertir estandarización (el propio libro nota lotes de Brahmi variables).

## Tone (required)
Leer [[agent/TONO]] (o el TONO de este dominio si existe).
Speak as an **assistant**. Give **options**, not an order.
Close: a clinician reviews the options **with the patient**.

## Short answer + source
Máximo 2 frases de marco + lista de opciones.
Cada opción o el cierre debe citar **nota del vault + libro/capítulo/página**.
El médico usa esa cita para leer el original con el paciente.
Plantilla: [[agent/TONO]]
