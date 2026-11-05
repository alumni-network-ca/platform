# École Maïmonide presentation, 5 November 2026

First meeting with École Maïmonide (Montreal), the prospective second school. Two versions of the same 23-slide deck, with speaker notes in their own language:

| File | |
|---|---|
| `Maimonide-presentation-2026-11-05-FR.pptx` / `.pdf` | French (the meeting language) |
| `Maimonide-presentation-2026-11-05-EN.pptx` / `.pdf` | English |

The deck covers why the platform exists, the alumni journey, the school journey (admin and reviewer), what is built and what is coming, and ends with an invitation for feedback before the live demo. The live demo is `scripts/demo/` (`npm run demo`).

Every screen is a real capture of the app on the local stack, with the fictional Maïmonide demo school from `scripts/demo/maimonide-demo.sql`. The request-form screen shows the optional student ID from PR #279 (ONB-09), which was not merged when the deck was made; the deck labels it as new.

Not presented as working: automatic emails, yearly confirmation, export, staff two-factor sign-in and duplicate merging. Pricing and naming the first school are left out on purpose (Noah's call).

## Rebuilding

`source/` holds the scripts that made the deck. They run outside the app and need extra packages (`pptxgenjs`, `react`, `react-dom`, `react-icons`, `sharp`):

1. Load the demo school on the local stack (`npm run demo -- --setup`) and start the app.
2. `capture-screens.mjs` captures every screen (desktop, `--lang en`, `--mobile`); `capture-student-id.mjs` captures the request form on a branch that has the student ID field.
3. `prepare-images.js` turns the captures into laptop screens, cards and rounded phone screens.
4. `build-deck.js fr|en` writes the deck.
