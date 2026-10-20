# Galpi experiment data

Every design decision in Galpi was measured on two coding agents, **Claude Code** and
**OpenAI Codex CLI**, before it was adopted. This page indexes those experiments: what each
one asked, how it was run, what it found, and where the full write-up is. Claims that the
measurements refuted are kept in the write-ups, not deleted.

Everything listed here is licensed under [CC BY 4.0](LICENSE): you may copy, adapt and
redistribute it, including commercially, **as long as you credit the source**
(see [How to cite](#how-to-cite)). The write-ups are in Korean with English tables and
identifiers; numbers below are copied from them.

## Common setup

| | |
|---|---|
| Agents | Codex CLI 0.144.4, model `gpt-5.6-sol`, reasoning effort `low`; Claude Code CLI 2.1.211, model `claude-sonnet-5` |
| Isolation | Ephemeral session per run, disposable detached git worktree, Claude auto-memory disabled from the C3 batch on, project-only setting sources |
| Fixtures | Small TypeScript learning-management app ([`galpi-lab/src/`](../galpi-lab/src/)), about 1,300 lines; one git commit per condition, source trees byte-identical where the condition only changes the Galpi layer |
| Grading | Hidden executable tests written after the agent exits (code tasks); semantic answer check plus clean worktree (read-only tasks) |
| Metrics | Total tokens from CLI JSON events; effective tokens `ET = 1.0*fresh_input + 0.1*cached_input + 4.0*output`; USD cost (Claude only); first relevant command index; read-content tokens (`o200k_base` proxy); route selection; state-rule compliance; repository-wide search rate; wrong-file changes |
| Harness | [`galpi-lab/scripts/phase1-ai-first-runner.mjs`](../galpi-lab/scripts/phase1-ai-first-runner.mjs) |

Conditions: **A** no Galpi, **B** human-readable Galpi (verbose `AGENTS.md`, YAML, Markdown
views), **C2/C3/C4** compact AI-first `.gp` Galpi (C3 = more explicit behavior rules,
C4 = C3 with rule enforcement moved to a PreToolUse hook). Phase 3.5: **M0** messy
structure, **M1** messy + Galpi, **M2** improved structure, **M3** improved + Galpi.

## Index

| # | Experiment | Question | Setup | Headline result | Write-up |
|---|---|---|---|---|---|
| 1 | Phase 1 protocol | How do we compare agents with and without a routing layer fairly? | Design only: 5 scenarios (DONE login fix, WIP+HOT sorting, PLAN billing question, DEAD legacy trap, alias-free route), 3 conditions, 3 repeats, decision rule | Fixes the metrics and the strict acceptance rule used by every later batch | [phase1-ai-first-protocol.md](../galpi-lab/docs/experiments/phase1-ai-first-protocol.md) |
| 2 | Phase 1: compact `.gp` vs verbose docs (Codex) | Does a compact, machine-readable index beat human-readable docs? | Codex, A/B/C2 x 5 scenarios x 3 = 45 runs (plus 45-run C1 batch) | C2 vs B: total tokens **-16.6%**, route selection 80% to **100%**, state-rule compliance 73.3% to **100%**, accuracy 100% for both. No Galpi (A) was still cheapest on this small repo (106k vs 118k tokens) | [phase1-ai-first.md](../galpi-lab/docs/experiments/phase1-ai-first.md) |
| 3 | Phase 1.5: cross-check on Claude Code, C3 and C4 | Does the result hold on a second agent? Does hook enforcement remove the cost of compliance? | Claude C2 (45 runs, later found contaminated by shared auto-memory), Claude C3 isolated (45), Codex C3 (45), Claude C4 hook-gated (45) | Codex C3: tokens **-20.3%**, state compliance 66.7% to 100%, passes the gate. Claude C3: accuracy 100% but tokens **+12.1%**. Claude C4 (hook gating): token gap **+12.1% to +1.9%**, ET -1.3%, cost -2.8%, route/state **+26.7 pp** | [phase1-claude.md](../galpi-lab/docs/experiments/phase1-claude.md) |
| 4 | Phase 2: `galpi check` / `doctor` quality log | Where do the checker and the structural doctor give false positives or misses? | Running log of cases found in CI and code review | 3 false positives and 2 misses found and fixed (incl. a case-insensitive filesystem bypass of the hook) | [phase2-check.md](../galpi-lab/docs/experiments/phase2-check.md) |
| 5 | Phase 2: multi-file scenario design | Does an index prevent missed files in changes that span 3+ files? | Design: MF1 to MF4 scenarios and a completeness metric, run inside Phase 3.5 | Design only; MF1 and MF3 were used in Phase 3.5 | [phase2-multifile-design.md](../galpi-lab/docs/experiments/phase2-multifile-design.md) |
| 6 | Phase 3.5: M0 doctor baseline | Which structural fixes define the improved fixture? | `galpi doctor` on the messy fixture M0 | 30 findings; M2 fixes exactly these and nothing else | [phase35-m0-doctor.md](../galpi-lab/docs/experiments/phase35-m0-doctor.md) |
| 7 | Phase 3.5: structure vs index (2x2) | Is code structure upstream of an index? Is structure + index (hybrid) best? | M0/M1/M2/M3 x 4 scenarios x 3, both agents, n=12 per condition, 96 runs | Structure alone (M2) was the **cheapest condition on both agents** (vs M1: Claude -23.8%, Codex -10.7%). Galpi cut code read by **63.4%** (Claude) and **77.8%** (Codex) but raised total tokens, because the bootstrap adds turns. The unconditional hybrid claim was withdrawn | [phase35-structure.md](../galpi-lab/docs/experiments/phase35-structure.md) |

### Phase 3.5 Stage B totals (n=12 per condition)

| Condition | Claude total tokens | Codex total tokens | Claude read tokens | Codex read tokens |
|---|---:|---:|---:|---:|
| M0 messy, no Galpi | 468,394 | 162,971 | 7,414 | 9,367 |
| M1 messy, Galpi | 553,543 | 174,452 | 5,565 | 5,175 |
| **M2 improved, no Galpi** | **421,919** | **155,827** | 5,992 | **1,468** |
| M3 improved, Galpi | 544,598 | 167,069 | **2,714** | 2,080 |

Scale hypothesis (not a claim): code reading is about 1.3% of total tokens on this
fixture. A linear extrapolation puts break-even at roughly 37x more reading
(a 40k to 50k line repository). It has not been measured.

### Metrics withdrawn after instrument fixes

- `averageReadFiles`, `averageUnrelatedReads`: biased by file granularity when the
  structure changes. Read-content tokens replace them.
- The completeness advantage in Stage A came from over-declared spread files; after
  deriving them from the reference patch, all conditions tied at 100%.
- The Codex mf1 accuracy gap was a prompt ambiguity; after the fix, 4/4 passed
  (`p35-mf1-fixcheck`).

## Raw run output

**Not included.** The runner writes raw output to `galpi-lab/.experiments/` (git-ignored):
one folder per batch under `.experiments/phase1-ai-first-runs/<run-id>/` with
`metadata.json`, `results.json`, `aggregate.json`, per-run JSONL event logs, stderr,
patches, and `results.before-*.json` snapshots taken before each re-analysis. Those folders
are not in this repository or its published branches, so the write-ups above are the
published record. Batch ids referenced in them: `full-v1`, `full-v2`, `claude-full-1`,
`claude-c3-1`, `c3-smoke-1`, `codex-c3-1`, `claude-c4-1`, `c4-smoke-1`, `p35-stageA-1`,
`p35b-claude-1`, `p35b-codex-r{1,2,3}{a,b}`, `p35-mf1-fixcheck`.

## Reproducing

Requirements: Node.js 20+, the Codex CLI and/or Claude Code CLI installed and signed in,
and the fixture commits available locally (`git fetch origin` brings the
`phase1-ai/fixture-*` and `phase35/fixture-m*` branches).

```bash
cd galpi-lab
npm ci

# Phase 3.5, 2x2 structure vs index
node scripts/phase1-ai-first-runner.mjs --suite=phase35 --agent=codex --repeats=3 --run-id=<new-id>
node scripts/phase1-ai-first-runner.mjs --suite=phase35 --agent=claude --repeats=3 --run-id=<new-id>

# Phase 1 A/B/C
node scripts/phase1-ai-first-runner.mjs --agent=codex --repeats=3 --run-id=<new-id>

# Re-grade an existing batch without re-running agents
node scripts/phase1-ai-first-runner.mjs --reanalyze=.experiments/phase1-ai-first-runs/<run-id>

# Check fixtures only
node scripts/phase1-ai-first-runner.mjs --suite=phase35 --validate-only
```

Other options: `--conditions=`, `--scenarios=`, `--retry-excluded=<run dir>` (re-runs
groups that failed for infrastructure reasons such as usage limits), `--keep-worktrees`.
The runner was written on Windows and its default CLI paths are Windows paths
(`%LOCALAPPDATA%` for `codex.exe`, `%USERPROFILE%\.local\bin\claude.exe`); set `CODEX_EXE`
or `CLAUDE_CLI_PATH` elsewhere. `--validate-only` also needs the agent CLI to be found.

Known gap: the Phase 1 condition C in the runner points at the C4 fixture
(`phase1-ai/fixture-c4`, `b6b8c20`), and the C3 fixture (`3c5a284`) is also referenced.
Neither commit is in the published branches, so the Phase 1 suite cannot be re-run from
this repository as is. The Phase 3.5 suite can.

Agents are stochastic, so absolute numbers vary between batches; the write-ups compare
conditions within one batch only. Raw logs contain local absolute paths; remove them
before publishing new output.

## How to cite

Credit is required for any reuse of this material. Use GitHub's **Cite this
repository** button (from [`CITATION.cff`](../CITATION.cff)), or:

> Jason (@jasonwpgml). *Galpi: AI-native codebase navigation for coding agents*,
> experiment data. https://github.com/jasonwpgml/galpi

```bibtex
@software{galpi2026,
  author  = {Jason (jasonwpgml)},
  title   = {Galpi: AI-native codebase navigation for coding agents},
  year    = {2026},
  version = {0.1.0},
  url     = {https://github.com/jasonwpgml/galpi},
  license = {Apache-2.0 (code), CC-BY-4.0 (experiment data and spec)}
}
```
