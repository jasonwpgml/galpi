# Galpi

**English** | [한국어](README.ko.md)

**AI-native codebase navigation for coding agents: improve structure first, index only what code cannot say, and measure everything on Claude Code and Codex.**

Galpi (갈피) is an open-source, experimental navigation layer that keeps AI coding agents such as **Claude Code** and **OpenAI Codex** from getting lost in a codebase. It works in two places:

- **Upstream**, it improves the code structure itself (clear names, small single-purpose files, tests next to code), checked by `galpi doctor`.
- **Downstream**, it adds a compact, machine-readable index (`.gp` files) only for what code cannot express: **task state** (done, WIP, plan, dead, locked), **intent**, and **routing** from a task alias to the minimal set of files.

The depth of the index scales with the project (L0 to L3). On a small project, leaving out `.galpi/` entirely is the prescribed setting, not an exception; that rule comes from measurement.

> Goal: a new hire on day one who works like the team lead.

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-lightgrey.svg)](experiments/LICENSE)

This repository is **an experiment, not a product**. Every design decision is measured on two agents before it is adopted, and claims that measurement refuted stay in the docs.

---

## The problem

A coding agent that opens an unfamiliar repository usually greps everywhere, reads files that are unrelated to the task, reuses code that was meant to be deleted, and starts writing code for features that are still only a plan. Instructions like "don't touch `legacy/`" in a long `AGENTS.md` are followed only some of the time.

Galpi tests three answers to that, separately and together:

1. **Structure**: make the code easier to navigate so no index is needed.
2. **A compact index**: tell the agent where to go and what state each area is in, in as few tokens as possible.
3. **Enforcement outside the prompt**: block writes to dead or locked code with a PreToolUse hook, pre-commit and CI, instead of hoping the model complies.

## How it works

```
BOOT.gp + MAP.gp  ->  route(alias)  ->  task view .galpi/v/t/<task>.gp  ->  only the files that view lists
```

| State code | Meaning | Agent behavior |
|---|---|---|
| `0` | done | normal |
| `1` | wip | read the linked status file before the code |
| `2` | plan | plan only; do not write code |
| `3` | exp | experimental |
| `4` | **dead** | never open, reuse or modify |
| `5` | stale | code and index disagree; widen the search |
| `h` | hot | changes often |
| `l` | **lock** | do not modify without an explicit request |

`4` (dead) and `l` (lock) do not depend on prompt compliance: the PreToolUse hook rejects Write/Edit with exit 2, and pre-commit and CI catch the rest.

| Level | When | What |
|---|---|---|
| `L0` structure only | small, single task | AI-friendly structure rules + a few lines of `AGENTS.md`. **No `.galpi`** |
| `L1` shallow routing | domains start to split | L0 + BOOT + source + routes, no views |
| `L2` full index | large, heavy projects | the full compact protocol |
| `L3` collaboration | many agents or people | L2 + packets for handoff and verification ([spec draft](GALPI_SPEC_v0.2_draft.md)) |

This repository runs at L2. Automatic level selection is not implemented yet.

## Quick start

Requirements: Node.js 20+.

```bash
git clone https://github.com/jasonwpgml/galpi.git
cd galpi/galpi-lab
npm ci

npm run check                          # typecheck + 19 tests + galpi check + manifest freshness + build
npm run galpi -- check                 # runtime contract validation (exit 1 = violation)
npm run galpi -- doctor                # structural diagnostics (always exit 0)
npm run galpi -- doctor --root <path>  # diagnose another repository
npm run galpi -- build                 # code graph manifest from the real code
npm run galpi -- query 수강신청 --human  # task alias -> minimal files, symbols, dependencies
```

Aliases in the sample app are Korean (`수강신청` = course enrollment). Mutations go through the CLI (`set-state`, `add-route`, `rm-route`, `add-task`, `add-domain`), which validates the schema before writing, checks references after, and rolls back byte for byte on failure. Do not edit `.galpi/` by hand.

**If you are an agent working in this repo**, do not use this README as context. Start at `galpi-lab/.galpi/BOOT.gp` and read `galpi-lab/.galpi/MAP.gp` in the same call; `galpi-lab/AGENTS.md` is the 3-line bootstrap.

## Results

All numbers are measured, from isolated runs with hidden tests. Full index with setup and reproduction: **[experiments/README.md](experiments/README.md)**.

**Compact `.gp` index vs verbose human-readable docs (Phase 1, Codex `gpt-5.6-sol`, 45 runs).** Total tokens **-16.6%**, route selection 80% to **100%**, state-rule compliance 73.3% to **100%**, repository-wide search 20% to **0%**, accuracy 100% for both. With more explicit rules (C3), Codex total tokens fell **-20.3%**.

**Enforcement beats prompting (Phase 1.5, Claude Code `claude-sonnet-5`).** Explicit rules brought Claude to 100% accuracy but cost **+12.1%** tokens. Moving enforcement into a PreToolUse hook (C4) cut the overhead to **+1.9%** total tokens, with effective tokens **-1.3%**, cost **-2.8%**, and route/state compliance **+26.7 pp** vs verbose docs.

**Structure is upstream of the index (Phase 3.5, 2x2, both agents, 96 runs).**

| Condition | Claude total tokens | Codex total tokens | Claude code read (tokens) |
|---|---:|---:|---:|
| M0 messy, no Galpi | 468,394 | 162,971 | 7,414 |
| M1 messy, Galpi | 553,543 | 174,452 | 5,565 |
| **M2 improved structure, no Galpi** | **421,919** | **155,827** | 5,992 |
| M3 improved structure, Galpi | 544,598 | 167,069 | **2,714** |

Galpi does what it was built for: code read fell **63.4%** (Claude) and **77.8%** (Codex). But on this 1,300-line fixture, total cost went up, because the BOOT, MAP and view bootstrap adds turns (commands before first code contact: 1.25 to 5.33 on Claude) and each turn resends the context. **Structure alone was the cheapest condition on both agents**, so the earlier "always hybrid" claim was withdrawn in favor of scale-adaptive levels. Where the index starts paying off is a hypothesis (roughly 40k to 50k lines by linear extrapolation), not a measured result.

Metrics that turned out to be biased (file counts, a completeness advantage, a prompt-ambiguity accuracy gap) are documented with their fixes in the write-ups.

## Repository layout

```
galpi/
├─ experiments/                 experiment index, reproduction, how to cite (CC BY 4.0)
├─ GALPI_SPEC_v0.2_draft.md     L3 collaboration packet spec, draft (CC BY 4.0)
├─ .github/workflows/check.yml  CI: npm run check + doctor in galpi-lab
├─ .githooks/pre-commit         galpi check when galpi-lab is staged
└─ galpi-lab/                   protocol implementation and test fixture
   ├─ .galpi/                   AI runtime: BOOT, source, derived MAP/views/manifest, handoff
   ├─ tools/galpi/              CLI + PreToolUse hook
   ├─ scripts/                  experiment harness (agent A/B runner)
   ├─ docs/                     roadmap, experiment write-ups, plans (mostly Korean)
   └─ src/                      sample learning-management app used as the fixture
```

Status: Phases 0 to 2 and 3.5 are complete; Phase 3 (`galpi build`/`query`) is an MVP; agent integration, instruction-layer optimization and usage-based self-improvement are designed but not built. See [galpi-lab/docs/roadmap.md](galpi-lab/docs/roadmap.md).

## FAQ

**How do I stop Claude Code or Codex from editing legacy or deprecated code?**
Mark the domain dead (`4`) or locked (`l`) with `galpi set-state` and install the PreToolUse hook (`galpi-lab/tools/galpi/hooks/pretooluse.mjs`, wired in `galpi-lab/.claude/settings.json`). Writes are rejected at the tool level, and `galpi check` in pre-commit and CI catches edits made another way.

**Does an AGENTS.md or code index save tokens for coding agents?**
It depends on size. A compact index beat verbose docs on both agents, but on a 1,300-line repository no index at all, with good structure, was cheaper still. Galpi's answer is to scale the index with the project.

**Is this a ready-to-use tool?**
Not yet. The CLI and hook work and are tested, but they are built around the sample app in `galpi-lab/`. Treat this as a measured design you can borrow from.

**What does the name mean?**
*Galpi* is a Korean word meaning both "bookmark" and "one's bearings".

## Using Galpi / citation

You are welcome to use, modify and redistribute Galpi, commercially or not. The one thing asked in return is credit:

- **Code** ([Apache-2.0](LICENSE)): keep the [`NOTICE`](NOTICE) file with any copy or derivative work, as the license requires, and mention the project in your README or docs, for example:

  > Built on [Galpi](https://github.com/jasonwpgml/galpi) by Jason ([@jasonwpgml](https://github.com/jasonwpgml)).

- **Experiment data, write-ups and the spec** ([CC BY 4.0](experiments/LICENSE)): `experiments/`, `galpi-lab/docs/experiments/` and `GALPI_SPEC_v0.2_draft.md`. Any use, including papers, blog posts, benchmarks, derived specs or model training, must credit "Galpi by Jason (@jasonwpgml)" and link to this repository.
- GitHub's **"Cite this repository"** button uses [`CITATION.cff`](CITATION.cff). A BibTeX entry is in [experiments/README.md](experiments/README.md#how-to-cite).

If it helped, a star is always appreciated.

## Contributing

Issues and pull requests are welcome, and a well-run measurement that disproves a claim counts as a contribution. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code: [Apache-2.0](LICENSE) © 2026 Jason ([@jasonwpgml](https://github.com/jasonwpgml)). Experiment data, write-ups and spec: [CC BY 4.0](experiments/LICENSE). See [NOTICE](NOTICE).
