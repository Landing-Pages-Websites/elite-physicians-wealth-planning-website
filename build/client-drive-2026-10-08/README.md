# Client Drive delivery — 2026-10-08

The client's own files, kept as the source of record for the copy in
`src/lib/client-content.json`.

- `docx/`: the documents exactly as delivered.
- `text/`: plain-text exports, made with macOS `textutil` for the docx files and
  `pdftotext -layout` for the guide. `scripts/build-client-content.py` reads
  these and nothing else.
- `text/Michael_Epps_Jr_bio_transcribed.txt`: Michael Epps Jr.'s bio arrived as
  an image (`Mike jr bio .png`), so it was transcribed word for word.

Regenerate with `python3 scripts/build-client-content.py` from the repo root.

## Where the images went

| Delivered as | Shipped as |
|---|---|
| `mike 2 pic.png` | `public/images/team/michael-a-epps.jpg` (+ `thumbs/` crop for the roster) |
| `Rodrick Johnson.jpg` | `public/images/team/roderick-johnson.jpg` |
| `La-Deidra Blake_.jpg` | `public/images/team/la-deidra-blake.jpg` |
| `Mike JR.jpg` | `public/images/team/michael-epps-jr.jpg` (+ `thumbs/` head-and-shoulders crop for the roster) |
| `Aliaya Epps_.png` | `public/images/team/aliaya-epps.jpg` |
| `Gabriella Gomez-Sanchez.jpg` | `public/images/team/gabriella-gomez-sanchez.jpg` |
| `Joshua Epps_.png` | `public/images/team/joshua-epps.jpg` |
| guide PDF | `public/guides/physician-tax-retirement-planning-guide-2026.pdf` |

Held, with the reasons in `build/CLIENT-GAPS.md`: `2025 - Doug.JPG`,
`doc 2.png`, `Doc1.png`, `pic 3.png` and `team pic.jpeg`.
