# Phase 1 AI-First comparison protocol

## Objective

Compare repository work performed by the same Codex CLI model under three conditions. The application commit is identical; only the Galpi routing layer differs.

| Condition | Commit | Repository instructions |
| --- | --- | --- |
| A: no Galpi | `2dc7e17579eae7ebe758752c31e6dcbce4f54a53` | no `AGENTS.md` or `.galpi/` |
| B: human-readable Galpi | `d88113f216b99fdc0026af4b21195b9b71a4c4a9` | verbose `AGENTS.md`, YAML MAP/source, Markdown Views |
| C: AI-first Galpi | `1469da75f7b46e0499f3faa792cead19973c3629` | two-line `AGENTS.md`, compact `.gp` boot/MAP/Views |

The source tree, package files, billing plan, and seeded login defect are byte-identical across A/B/C. Roadmaps and explanatory project documents are absent from all three fixtures so the agent cannot read the experiment answer.

## Execution controls

- Model: `gpt-5.6-sol`
- Reasoning effort: `low`
- CLI: isolated ephemeral `codex exec --json` session
- Permissions: full writes only inside a disposable detached worktree
- Repeats: 3 independent runs for every condition/scenario pair
- Scheduling: A, B, and C run concurrently inside a matched block; blocks run sequentially
- Timeout: 300 seconds per run
- Total: 5 scenarios x 3 conditions x 3 repeats = 45 runs

## Scenarios

1. `login`: fix a seeded login account-enumeration leak and add a regression test. Expected route `a.login`, state DONE.
2. `sorting`: add optional student list sorting with the prescribed public API. Expected route `st.list`, state WIP+HOT.
3. `billing`: answer an implementation-status/planning question without edits. Expected route `b.invoice`, state PLAN.
4. `roster`: add a new student-domain semicolon preview API while the prompt mentions the old legacy importer. Expected route `lg.import`, state DEAD; legacy files must not be read, reused, or changed.
5. `session-flow`: identify the credential-exchange implementation and test using wording that contains none of the exact route aliases. Expected inferred route `a.login`; read-only.

Code scenarios are checked with hidden executable tests written only after the agent exits. Read-only scenarios are checked semantically from the final answer and for a clean worktree. Hidden evaluator files are removed immediately after execution.

## Recorded metrics

- first relevant-file command index
- content-read files and unrelated content-read files
- static bootstrap/context token proxy
- static task-query result token proxy
- actual Codex input, cached input, output, reasoning, and total tokens
- repository-wide search use
- expected MAP/View route selection
- state-rule compliance
- protocol parse failure or clarification request
- changed paths and wrong-file modifications
- relevant test command success and hidden evaluator success
- legacy DEAD file read/change for the roster task

Component token counts use `o200k_base` as a reproducible proxy because the exact private tokenizer mapping for this model is not exposed. Codex JSON events remain the source of truth for actual total token use.

## Decision rule

C is accepted as the Phase 1 format only if it preserves task correctness and state-rule accuracy, reduces both protocol component tokens and actual total tokens relative to B, reaches relevant files no later, does not increase unrelated reads, and does not increase repository-wide searches.
