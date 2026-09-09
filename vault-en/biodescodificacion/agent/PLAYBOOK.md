---
language: en
type: Playbook
title: Playbook biodescodificacion
description: "Entrevista en tres tiempos + sentido biologico, sin sustituir clinica."
tags: [alt-med, okf, biodescodificacion]
generated:
  by: process:grok-alt-med-vault
  at: 2026-09-09T03:35:00Z
status: draft
stale_after: 2027-09-09
sources:
  - id: corbera-codigo-sintoma
    resource: attachments/corbera_enric_-_biodescodificacion_-_el_codigo_secreto_del_sintoma.pdf
    title: "Biodescodificacion El codigo secreto del sintoma (Enric Corbera y Rafael Maranon)"
    author: human:Enric-Corbera
    last_modified: 2010-01-01T00:00:00Z
  - id: diccionario-biodescodificacion-comp
    resource: "attachments/Diccionario de Biodescodificacion ( PDFDrive ).pdf"
    title: Diccionario de Biodescodificacion (compilacion DecidaTriunfar / fuentes Corbera, Sellam, Fleche, Hamer, Hay, Martel)
    author: human:compilador-joanmarcbio
    last_modified: 2015-01-01T00:00:00Z
  - id: vault-curation
    resource: boericke-vault/biodescodificacion/
    title: Agent index and paraphrased conflict themes (not a reprint)
    author: process:grok-alt-med-vault
    last_modified: 2026-09-09T03:35:00Z
---

# Playbook

1. Disclaimer.
2. Síntoma concreto (órgano + lado + cuándo empezó).
3. Buscar [[biodescodificacion/indexes/POR-SINTOMA]] y la entrada.
4. Preguntar las tres capas de Corbera:
   - Etapa biológica (qué pasaba al aparecer el síntoma)
   - Proyecto sentido (concepción–3 años, deseo parental)
   - Transgeneracional (secretos, lealtades)
5. Devolver: tema de conflicto *según el diccionario*, pregunta abierta, y recordatorio médico.
6. Corbera advierte no simplificar 1 síntoma = 1 emoción fija. Ofrece 1–3 hipótesis, no un veredicto.

## Tone (required)
Leer [[agent/TONO]] (o el TONO de este dominio si existe).
Speak as an **assistant**. Give **options**, not an order.
Close: a clinician reviews the options **with the patient**.

## Short answer + source
Máximo 2 frases de marco + lista de opciones.
Cada opción o el cierre debe citar **nota del vault + libro/capítulo/página**.
El médico usa esa cita para leer el original con el paciente.
Plantilla: [[agent/TONO]]
