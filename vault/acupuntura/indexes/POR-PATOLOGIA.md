---
type: Index
title: Por patologia
description: "Entrada del agente: queja → nota de patología con puntos y correspondencias."
tags: [alt-med, okf, tcm, patologia]
generated:
  by: process:grok-alt-med-vault
  at: 2026-09-09T03:25:00Z
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
    last_modified: 2026-09-09T03:25:00Z
---

# Por patología (entrada del agente)

Flujo: queja del usuario → esta tabla → nota `patologias/*.md` → puntos + emoción + sabor + canal.

Tabla madre de correspondencias: [[acupuntura/teoria/Correspondencias]]

| Patología / queja | Movimiento | Emoción | Sabor | Nota |
|---|---|---|---|---|
| Cefalea occipital / nuca | Agua (+ Taiyang) | Miedo, hipervigilancia | Salado (no abusar si humedad) | [[acupuntura/patologias/Cefalea-occipital]] |
| Cefalea temporal / jaqueca Shaoyang | Madera | Ira contenida, irritabilidad | Ácido con mesura; reducir grasa y alcohol | [[acupuntura/patologias/Cefalea-temporal]] |
| Cefalea frontal / sinus / Yangming | Metal + Tierra | Tristeza o preocupación digestiva | Picante suave en exterior; dulce neutro si vacío | [[acupuntura/patologias/Cefalea-frontal]] |
| Tos, piel seca, duelo | Metal | Tristeza, duelo no elaborado | Picante suave (jengibre, cebolleta) si exterior; pera/blanco si sequedad | [[acupuntura/patologias/Tos-piel-duelo]] |
| Fatiga, pesadez, rumia | Tierra | Preocupación, dar vueltas | Dulce neutro (calabaza, arroz); evitar dulce industrial | [[acupuntura/patologias/Fatiga-humedad]] |
| Ansiedad, opresión, náusea | Fuego ministro | Agitación, alegría inquieta | Amargo suave (hojas verdes) | [[acupuntura/patologias/Ansiedad-pecho]] |
| Insomnio / shen no anclado | Fuego + Agua | Agitación o miedo nocturno | Amargo por la tarde; salado ligero si yin vacío | [[acupuntura/patologias/Insomnio-shen]] |
| Lumbago, frío, jing débil | Agua | Miedo, inseguridad existencial | Salado de calidad (algas, huesos) no snacks | [[acupuntura/patologias/Lumbar-frio]] |
| Ciclo irregular, leucorrea, flancos | Madera + Chong/Dai | Ira + rumia | Ácido y dulce neutro; menos frío crudo | [[acupuntura/patologias/Ciclo-Dai]] |
| Reumatismo / síndrome Bi | Depende del clima (viento-Madera, frío-Agua, humedad-Tierra) | Según elemento dominante | Según clima: no unificar | [[acupuntura/patologias/Reumatismo-bi]] |
| Gastritis, plenitud, náusea alimentaria | Tierra | Preocupación que se come o no se come | Dulce neutro, tibio; amargo si fuego de estómago | [[acupuntura/patologias/Digestivo-estomago]] |
| Acúfenos, sordera de vacío, vértigo agua | Agua (si vacío) o Madera (si viento) | Miedo o ira | Salado de calidad o ácido según patrón | [[acupuntura/patologias/Oido-miedo]] |

## Alias rápidos
- dolor de cabeza atrás → [[acupuntura/patologias/Cefalea-occipital]]
- dolor de sien / amargo → [[acupuntura/patologias/Cefalea-temporal]]
- frente / resfriado → [[acupuntura/patologias/Cefalea-frontal]]
- tos / pena / piel → [[acupuntura/patologias/Tos-piel-duelo]]
- cansancio / mente que rumia → [[acupuntura/patologias/Fatiga-humedad]]
- ansiedad / pecho → [[acupuntura/patologias/Ansiedad-pecho]]
- no duermo → [[acupuntura/patologias/Insomnio-shen]]
- lumbar / miedo / frío → [[acupuntura/patologias/Lumbar-frio]]
- regla / PMS → [[acupuntura/patologias/Ciclo-Dai]]
- articulaciones → [[acupuntura/patologias/Reumatismo-bi]]
- estómago → [[acupuntura/patologias/Digestivo-estomago]]
- oídos → [[acupuntura/patologias/Oido-miedo]]
