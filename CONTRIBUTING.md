# Contributing to Chex

First off, thank you for considering contributing to Chex — every bug report, suggestion, and pull request genuinely helps. This document lays out the conventions used in the project so contributions are easy to review and merge.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Project Philosophy](#project-philosophy)
- [Getting Set Up](#getting-set-up)
- [Branching Model](#branching-model)
- [Commit Message Conventions](#commit-message-conventions)
- [Coding Guidelines](#coding-guidelines)
- [Adding or Modifying a Variant](#adding-or-modifying-a-variant)
- [Testing Your Changes](#testing-your-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Ways to Contribute

- **Bug fixes** — correctness issues in the move engine, variants, UI, or multiplayer sync.
- **New variants** — additional chess variants built on the existing `window.variants` module pattern.
- **Performance** — rendering, engine communication, or Firebase read/write efficiency improvements.
- **Accessibility** — keyboard navigation, screen‑reader support, color‑contrast improvements.
- **Documentation** — README clarity, inline code comments, this guide.
- **Design** — new themes, icon/asset improvements, layout refinements.

## Project Philosophy

Chex intentionally has **no build step, no framework, and no package manager dependency** for the client. Please keep contributions consistent with that:

- Plain HTML/CSS/JS only — no bundlers, transpilers, or frameworks.
- Prefer small, composable functions over large monolithic ones.
- Keep the rules engine (`js/engine.js`) and the variants layer (`js/variants.js`) cleanly separated — variants should *toggle and constrain* behavior, not fork the core engine.
- Favor readability over cleverness; this is a project other students and hobbyists will read and learn from.

## Getting Set Up

```bash
git clone https://github.com/usamagulzar/chex.git
cd chex
python3 server.py
# open http://localhost:8000
```

If you're working on multiplayer or auth features, you will need your own Firebase project — see the **Configuration** section of the [README](README.md) for setup steps. Never commit real production Firebase credentials in a pull request; use a personal test project instead.

## Branching Model

- `main` — always deployable, mirrors the live demo.
- Feature branches — created off `main`, named descriptively:
  - `feature/<short-description>` for new functionality (e.g. `feature/king-of-the-hill`)
  - `fix/<short-description>` for bug fixes (e.g. `fix/en-passant-edge-case`)
  - `docs/<short-description>` for documentation-only changes

Please branch from an up-to-date `main` and rebase (rather than merge) to keep history linear where practical.

## Commit Message Conventions

Chex loosely follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional longer description]
```

**Types:** `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`, `chore`

**Examples:**

```
feat(variants): add King of the Hill variant
fix(engine): correct en passant capture square after double pawn push
docs(readme): clarify draft mode point costs
refactor(ui): extract board rendering into smaller functions
```

## Coding Guidelines

- **Indentation:** 2 spaces, no tabs.
- **Semicolons:** always used — match existing style in each file.
- **Naming:** `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for true constants (e.g. `PIECE_VALUES`, `DRAFT_BUDGET`).
- **Global state:** the project uses a small number of intentional `window.*` namespaces (`window.app`, `window.variants`, `window.multi`, `window.auth`, `window.ui`). New global state should follow this pattern rather than introducing scattered top‑level variables.
- **Comments:** explain *why*, not *what* — the existing code favors short comments on non‑obvious rules (see `js/variants.js` for examples of the expected tone and density).
- **CSS:** use the existing custom‑property (`--variable`) theme tokens defined in `:root` rather than hardcoding colors, so new UI respects all four built‑in themes automatically.

## Adding or Modifying a Variant

Chex's variants all follow a consistent shape inside `window.variants`:

1. A boolean `*Enabled` flag (e.g. `diceChessEnabled`).
2. A getter `is*Active` that combines the flag with the current game phase (e.g. suspending during Draft Mode setup).
3. Any variant-specific state (e.g. `allowedDiceTypes`, `brainSuggestedPiece`).
4. Logic hooks called from `js/app.js`/`js/engine.js` at the relevant point in the turn cycle (move validation, post‑move resolution, or rendering).
5. A settings‑screen toggle added in `index.html` (both the online and offline variant panels) and a corresponding PGN `[Variant "..."]` header tag on export.

When adding a new variant, please also document its rules in the README's [Game Variants](README.md#-game-variants) section, following the existing format (a short intro, then a **Rules** or **Setup rules / Gameplay rules** list).

## Testing Your Changes

There is currently no automated test suite — changes are verified manually. Before opening a PR, please check:

- [ ] A full offline game can be played start to finish without console errors.
- [ ] If you touched the engine or a variant, illegal moves are still correctly rejected and check/checkmate/stalemate detection still works (where applicable to that variant).
- [ ] The Service Worker still installs and the app boots offline (`chrome://inspect` → Application → Service Workers, or airplane mode after first load).
- [ ] The app renders correctly across all four built‑in themes.
- [ ] No regressions in existing variants when combined with your change, where combination is expected to be supported.

## Submitting a Pull Request

1. Fork the repository and create your branch from `main`.
2. Make your changes, following the guidelines above.
3. Update documentation (README and/or code comments) for any user‑facing or behavioral change.
4. Open a pull request with:
   - A clear title following the commit convention (e.g. `feat(variants): add King of the Hill`).
   - A description of *what* changed and *why*.
   - Screenshots or a short clip for any UI change.
   - Reference to any related issue (`Closes #123`).
5. Be responsive to review feedback — small, focused PRs are reviewed and merged fastest.

## Reporting Bugs

Open an [issue](https://github.com/usamagulzar/chex/issues) and include:

- Steps to reproduce.
- Expected vs. actual behavior.
- Browser/OS and whether you were playing offline or online.
- Whether any variant was enabled at the time.
- Console errors, if any (DevTools → Console).

## Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues as well. Please explain the motivation and, where relevant, sketch how it would interact with existing variants or the multiplayer layer.

---

Thank you again for helping make Chex better. 🖤
