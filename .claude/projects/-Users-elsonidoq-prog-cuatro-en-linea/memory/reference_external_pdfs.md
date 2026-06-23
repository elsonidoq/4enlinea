---
name: reference-external-pdfs
description: "External reference PDFs in docs/external_references/ — page counts, chapter structure, and how to extract targeted sections"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 9fd8fff5-7bae-436e-be9f-5ff366fbbd5e
---

Three canonical Connect Four PDFs live at `docs/external_references/`. Use `pdfminer.six` (installed) to extract specific pages: `extract_text(path, page_numbers=[0-indexed list])`.

| File | Pages | Key sections |
|------|-------|-------------|
| `allis_connect4_thesis.pdf` | 91 | §3.3 Odd and Even Threats → PDF p.19–24; §6.1–6.9 Nine Rules → PDF p.36–46 |
| `bagan_2005.pdf` | 30 | Poset Positional Games (Maker-Breaker complexity) — NOT about Connect Four parity |
| `The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf` | 276 | Ch. 3 Strategic Threats → p.87; Ch. 4 Major Threat Analysis (T1-T7, V1-V5) → p.93 |

**Key facts confirmed from primary sources:**
- Allen T7 (p.100): "Red and Black odd-row threats in separate columns **cancel each other**" → Draw
- Allen G3 (p.95): Red wants ODD count of odd-threated columns; 2 = even = Draw
- Allen V2 (p.101): Black wins only with **two** odd-row threats in separate columns
- Allis §3.3 case 4: odd+odd=even cells → Red forced first, both threats lost → Draw
- Bagan et al.: irrelevant to standard Connect Four parity; misattribution in old strategy ref was corrected

**Corrected rule outcomes (counter-intuitive):**
- 1R vs 1B odd-row threats in separate columns = Draw (not Red wins)
- 0R vs 1B odd-row threats = Draw (not Black wins)
