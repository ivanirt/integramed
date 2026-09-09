---
type: RelationshipGraph
title: GRAPH
description: Vault concept (relationships/GRAPH.md).
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

# Relationship graph

Edges taken from Boericke “Relationship / Compare / Complementary / Antidote / Dose” lines in the scan.

Use these to **differentiate** close scores, not to stack remedies.

## Legend

- `compare` — similar picture; pick by the missing keynote
- `complementary` — often follows or completes
- `antidote` — Boericke’s stated modifier / poison pairing
- `inimical` — avoid succession
- `follows` — typical sequence in acute → chronic

## Aconitum napellus

- complementary: Coffea, Sulphur (“Sulphur may be considered a chronic Aconite”)
- compare: Belladonna, Chamomilla, Coffea, Ferrum phosphoricum, Agrostis, Spiranthes
- follows: Sulphur often follows
- not for: localized exudative inflammations, malarial / hectic / pyemic states
- antidotal note: vinegar in large doses to poisonous effects; acids, wine, coffee, lemonade modify action
- related aconites in Boericke: Aconitine, A. lycoctonum, A. cammarum, A. ferox, Eranthis, Achyranthes

## Abies nigra

- compare: China, Bryonia, Pulsatilla (lump in stomach); Thuja, Sabina, Cupressus; Nux vomica, Kali carbonicum

## Abrotanum

- compare: Scrophularia, Bryonia, Stellaria, Benzoic acid (gout); Iodium, Natrum muriaticum (marasmus)

## Absinthium

- compare: Alcohol, Artemisia, Hydrocyanic acid, Cina, Cicuta

## Acalypha indica

- compare: Millefolium, Phosphorus, Aceticum acidum, Kali nitricum

## Acetanilidum

- compare: Antipyrinum

## Aceticum acidum

- antidotal to anaesthetic vapors; counteracts sausage poisoning (Boericke)
- compare: Ammonium aceticum, Benzoin odoriferum, Arsenicum, China, Digitalis, Liatris

## Actaea spicata

- compare: Cimicifuga, Caulophyllum, Ledum

## Adonis vernalis

- compare: Digitalis, Crataegus, Convallaria, Strophanthus
- note: Adonidin mentioned as non-cumulative Digitalis substitute (historical)

## Aesculus hippocastanum

- compare: Aloe, Collinsonia, Nux vomica, Sulphur, Phytolacca (throat), Aesculus glabra, Negundium

## Aethusa cynapium

- complementary: Calcarea
- compare: Athamanta, Antimonium, Calcarea, Arsenicum, Cicuta

## Agaricus muscarius

- compare: Muscarine, Amanita phalloides / vernus (toxicology notes), Tamus, Cimicifuga, Cannabis indica, Hyoscyamus, Tarentula
- antidote (Boericke): Absinthium, Coffea, Camphor

## Agnus castus

- compare: Selenium, Phosphoricum acidum, Camphora, Lycopodium

## Ailanthus glandulosa

- antidotes: Rhus, Nux
- compare: Ammonium carbonicum, Baptisia, Arnica, Muriaticum acidum, Lachesis, Rhus

## Agraphis nutans (index only)

- compare: Hydrastis, Cepa, Calcarea phosphorica, Sulphur iodatum, Calcarea iodata

## Pulsatilla pratensis

- typical compares in school use (complete from fuller editions when adding file body): Cyclamen, Sepia, Kali sulphuricum, Silicea
- differentiate from [[Sepia officinalis]]: Puls. weeps and *wants* consolation; Sepia is indifferent / irritable at consolation

## Sepia officinalis

- compare often: Murex, Lilium tigrinum, Natrum muriaticum, Nux
- upward direction of symptoms vs Aesculus sacral “gives out”

## Veratrum album

- compare: Arsenicum, Camphora, Cuprum (collapse cluster)
- differentiate: Verat. = cold sweat *on forehead* + violent evacuations

## Opium

- fright ailments; painlessness vs Aconite’s intolerant pain
- compare: Nux, Belladonna in stupor cluster

## Zincum metallicum

- compare (scan p.700): Agaricus, Ignatia, Plumbum, Argentum, Pulsatilla, Helleborus, Tuberculinum
- inimical: Nux, Chamomilla
- amel. by secretions: Lachesis, Stannum, Moschus

## Suggested acute → chronic arcs (Boericke + school usage encoded for the agent)

- Aconite → Sulphur (stated)
- Aethusa → Calcarea (stated complementary)
- Pulsatilla → Silicea / Sulphur (chronicity; add when notes expanded)
- Sepia often after neglected pelvic venous stasis pictures that looked like Aesculus acutely
