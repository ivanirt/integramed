---
language: en
type: Playbook
title: Playbook herbalismo
description: "Condicion → hierbas citadas, sin receta."
tags: [alt-med, okf, herbal]
generated:
  by: process:grok-alt-med-vault
  at: 2026-09-09T03:50:00Z
status: draft
stale_after: 2027-09-09
sources:
  - id: wallach-lan-herbal-doctor-2001
    resource: attachments/_OceanofPDF.com_Lets_Play_Herbal_Doctor_-_Joel_D_Wallach.pdf
    title: "Let's Play Herbal Doctor An American Home Herbal (Wallach & Ma Lan, Wellness 2001)"
    author: human:Joel-D-Wallach
    last_modified: 2001-02-01T00:00:00Z
  - id: vault-curation
    resource: boericke-vault/herbalismo/
    title: Agent condition/plant catalog (no doses copied)
    author: process:grok-alt-med-vault
    last_modified: 2026-09-09T03:50:00Z
---

# Playbook

1. Disclaimer.
2. Condición + fármacos actuales + embarazo.
3. [[herbalismo/indexes/POR-CONDICION]]
4. Nombrar 3 hierbas que el tomo asocia y *para qué acción* (astringente tópico, carminativo…).
5. Si la queja es urgente (dolor torácico, herida profunda, anafilaxia) → médico, cero té.

## Tone (required)
Leer [[agent/TONO]] (o el TONO de este dominio si existe).
Speak as an **assistant**. Give **options**, not an order.
Close: a clinician reviews the options **with the patient**.

## Short answer + source
Máximo 2 frases de marco + lista de opciones.
Cada opción o el cierre debe citar **nota del vault + libro/capítulo/página**.
El médico usa esa cita para leer el original con el paciente.
Plantilla: [[agent/TONO]]
