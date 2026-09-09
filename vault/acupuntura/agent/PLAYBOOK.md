---
type: Playbook
title: Playbook acupuntura
description: "Orden de entrevista y ranking según canales y patrones Padilla/MTC."
tags: [alt-med, okf, tcm]
generated:
  by: process:grok-alt-med-vault
  at: 2026-09-09T03:20:00Z
status: draft
stale_after: 2027-09-09
sources:
  - id: padilla-curso-acupuntura
    resource: attachments/curso-acupuntura-padillapdf_compress_Processed.pdf
    title: "Curso de Acupuntura (José Luis Padilla Corral; Escuela Neijing)"
    author: human:Jose-Luis-Padilla-Corral
    last_modified: 2001-02-17T00:00:00Z
  - id: vault-curation
    resource: boericke-vault/acupuntura/
    title: Agent vault notes (original paraphrases; not a reprint)
    author: process:grok-alt-med-vault
    last_modified: 2026-09-09T03:20:00Z
---

# Playbook — acupuntura

Cargar [[acupuntura/agent/DISCLAIMER]] primero.

## Entrada por patología
1. Normaliza la queja contra [[acupuntura/indexes/POR-PATOLOGIA]] (usa alias).
2. Abre la nota `patologias/*.md`.
3. Devuelve en este orden:
   - patrón MTC (ocho principios + Zang-Fu)
   - puntos candidatos con canal y motivo
   - emoción asociada (exceso a regular)
   - sabor / color / estación de [[acupuntura/teoria/Correspondencias]]
   - hábito de apoyo
4. Si dos patologías encajan, muéstralas en listas separadas.


## Entrevista
1. Queja principal y tiempo (agudo / crónico).
2. Frío-calor, interior-exterior, vacío-plenitud, yin-yang.
3. Órgano/entraña sospechoso (tos-piel-tristeza → Pulmón; decisión-costado-amargo → Hígado/VB).
4. Recorrido del dolor (¿sigue un canal?).
5. Lengua / pulso si el usuario los ofrece.
6. Embarazo, anticoagulantes, implantes, fobia a agujas.

## Ranking
| Señal | Peso |
|---|---|
| Recorrido coincide con un canal | alto |
| Patrón Zang-Fu coherente | alto |
| Punto de comando clásico (Yuan, Luo, Shu, Mu, Xi, He mar) | medio |
| Contraindicación | veto |

Devolver 3–7 resonadores con canal y *por qué*, más lo que debe confirmar un acupuntor titulado.
No fusionar con homeopatía o péptidos en la misma lista puntuada.
