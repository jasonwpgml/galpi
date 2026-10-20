# Contributing to Galpi

Thanks for helping. Issues, ideas, measurements on other agents or larger repositories,
and pull requests are all welcome. Galpi is an experiment, so a well-run measurement that
disproves a claim is as valuable as new code.

## Development

```bash
cd galpi-lab
npm ci
npm run check   # typecheck + tests + galpi check + manifest freshness + app build
git config core.hooksPath .githooks   # pre-commit runs galpi check
```

CI runs the same `npm run check`, plus `galpi doctor` as advisory output.

## Layout

| Path | What it is |
|---|---|
| `galpi-lab/.galpi/` | AI runtime: `BOOT.gp`, `source.gp` (single source of truth), derived `MAP.gp`, `manifest.gp`, `v/` views, `handoff.md` |
| `galpi-lab/tools/galpi/` | CLI and the PreToolUse hook |
| `galpi-lab/scripts/phase1-ai-first-runner.mjs` | Experiment harness (agent A/B runner) |
| `galpi-lab/docs/` | Roadmap, experiment write-ups, plans |
| `galpi-lab/src/` | Sample learning-management app used as the fixture |
| `experiments/` | Experiment index (CC BY 4.0) |

## Rules

- Do not edit `.galpi/` by hand. Use the CLI (`npm run galpi -- set-state`, `add-route`,
  `add-task`, ...); it validates before writing and rolls back on failure.
- Derived files (`MAP.gp`, `manifest.gp`, `v/`) are generated. Run
  `npm run galpi -- build` after code changes so `build --check` passes.
- Report measurements as measured. Keep refuted claims and the instrument fixes that
  changed a number; do not rewrite past results.
- Compare conditions within one batch only; agents are stochastic and absolute numbers
  move between batches.

By contributing you agree that code contributions are licensed under the Apache License
2.0, and contributions to `experiments/`, `galpi-lab/docs/experiments/` and the spec
under CC BY 4.0, the same as the project.
