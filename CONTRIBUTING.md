# Contributing to openResume

Thanks for helping improve openResume. This project is a local-first AI resume workspace focused on editable resume content, accurate A4 preview, and reliable PDF / DOCX / HTML export.

## Good First Contributions

- Fix UI copy, translations, or documentation gaps
- Improve import parsing for edge-case resumes
- Add focused unit tests for resume parsing, export formatting, or assistant guards
- Report reproducible export, import, or layout bugs
- Propose new templates with clear screenshots and test data

## Development Setup

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 after the dev server starts.

## Validation

Before opening a pull request, run:

```bash
pnpm test
pnpm build
```

If your change affects UI behavior, include screenshots or a short screen recording in the pull request.

## Pull Request Guidelines

- Keep changes focused on one feature, fix, or documentation improvement.
- Reuse existing components, hooks, utilities, naming, and styles.
- Do not add dependencies unless they are clearly necessary.
- Do not commit secrets, API keys, private resume data, or generated build output.
- Add or update tests when changing important logic.
- Explain user impact and validation steps in the pull request description.

## Privacy Expectations

openResume is designed to be local-first. Changes should avoid uploading user resume content unless the user explicitly configures an AI provider or export flow that requires a network call.
