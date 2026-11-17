# AGENTS.md

Instructions for AI agents (and humans) working in this repository. The rules in
"Core rules" apply everywhere. "Project specifics" at the bottom is filled in
per project. Subdirectories may carry their own CLAUDE.md / AGENTS.md with rules
for that module; the closer file wins on conflicts.

## Core rules

### 1. ASCII only

- Write code, comments, docs, commit messages and logs in plain ASCII.
- No em/en dashes, smart quotes, ellipsis characters, arrows, bullets, emoji or
  box-drawing characters. Use `-`, `--`, `"`, `'`, `...`, `->`, `*`.
- Exceptions: string literals that must hold non-ASCII text, translation files,
  test fixtures for unicode handling, and data that is non-ASCII by nature.
  If there is no concrete reason for a non-ASCII character, do not use it.
- Before finishing, check your changes: `grep -nP '[^\x00-\x7F]' <files>`.

### 2. Keep it simple

Write every language as if it were Go: limited, explicit control flow that a
reader can follow top to bottom.

- Prefer a plain `for` loop, `if` and early `return` over chained iterators,
  comprehensions, clever combinators, ternary chains or metaprogramming when
  the plain version is clearer.
- One way of doing a thing. No abstraction until there is a second real user
  of it. No speculative options, flags or extension points.
- Handle errors explicitly at the point they occur. Do not swallow them, and do
  not use panicking shortcuts (`unwrap`, `!`, bare `except`, etc.) outside tests
  unless failure is provably impossible.
- If using Rust do not implicit return from a function, always use the `return` keyword.
- Treat every number that comes from input (files, network, users, agents) as
  hostile: check bounds before indexing, guard divisions, cap allocations,
  bound recursion.
- No side effects inside asserts, debug-only code or log statements. They may
  be compiled out or skipped, and the side effect goes with them.

### 3. Minimal dependencies

- Never add a dependency without asking first. This includes dev and build
  dependencies.
- If a library would only give us one or two functions, vendor that code in
  instead (with its license header and a note of where it came from), or write it.
- Prefer the standard library. Ensure license compatibility, if the project license
  does not work with the library license, do not use it.


### 4. Segmentation

- Keep features in their own modules so they can be added or removed by
  touching as few places as possible: plug in, plug out.
- One concept per file. For example, one API endpoint, one command, or one
  handler per file, named after what it does. Avoid catch-all files like
  `utils`, `helpers`, `misc`, `*_commands`.
- Shared types and transport code live in their own modules, not inside a
  feature module.
- Dependencies between modules point one way. Lower layers never import higher
  ones.
- Removing a feature should mean deleting its directory and its registration
  line, not hunting through the codebase.

### 5. Fix bugs test-first

For logic bugs:

1. Write a test that reproduces the bug and fails.
2. Run it and confirm it fails for the reason you expect.
3. Fix the bug.
4. Run it and confirm it passes, along with the rest of the suite.

Skip this only where a test does not make sense (UI styling, layout, copy
changes). New features come with at least one test that would fail without them.
Never weaken, skip or delete a test or a check to make something pass.

- Prefer tests at the external interface (CLI, API, files written, protocol
  messages). They survive refactors and even rewrites; tests of private
  internals break with them.
- Check that tests actually ran. A skipped, filtered or empty test run is not
  a pass.

### 6. Read the spec

When implementing or talking to a service, file format, protocol or API, find
the authoritative reference (spec, RFC, official docs, schema) and read it
before writing code. Download it into `docs/reference/` (or note the URL and
version in the module header) so the facts are on hand. Do not guess field
names, limits, encodings or error semantics from memory or from examples.
If no spec exists, say so and record what behaviour was observed.

### 7. Comments

Code should explain itself by being explicit and simple. Comments are for what
the code cannot say.

- Every file starts with a short header comment: what this file is for.
- Public functions and types get a doc comment (javadoc / godoc / rustdoc
  style): what it does, how to call it, what it returns, and any hidden
  semantics (ownership, blocking, thread safety, units, side effects, errors).
- Inside function bodies, comment only when something is done in a
  non-obvious way or for a non-obvious reason. Say why, not what.
- No comments that restate the code, narrate changes ("now uses X", "fixed
  bug"), or mark sections for decoration.
- If a workaround needs a paragraph of comment to justify why it is OK, the
  code is wrong. Fix the code.

## File layout

Organize each file to read top to bottom, important things first:

1. Header comment, then imports.
2. Constants.
3. The primary type or function the file exists for.
4. Supporting types below it.
5. Methods: constructors, then public methods, then private helpers.
   Callers above callees.

Tests: constants and fixtures first, then test cases, then test helpers last.

## Working style

- Read before you write. Look at the surrounding code and match its naming,
  structure and idiom.
- Do what was asked. Do not refactor, rename or reformat unrelated code in the
  same change.
- Keep the build green at every step. Commit small and often; each commit is a
  working state. Commits can be squashed at the end as needed.
- Report honestly. A stub, partial implementation or untested path is reported
  as such, never as done. Say whether a number was measured or estimated.
- No stubs or placeholders to get something compiling or passing: no empty
  function bodies, hard-coded stand-in values, `todo!()`-style panics or
  disabled checks. If something cannot be finished, stop and say so.
- Prefer rules enforced by tools (types, compiler, linter, tests, check
  scripts) over rules enforced by prose. When a rule here can be checked
  automatically, add the check.
- Fix the process, not just the instance. When the same kind of mistake
  happens twice, add a rule to this file (or the module's CLAUDE.md) or a check
  that catches it.
- For large jobs (many errors, many failing tests, many files), write the work
  list to a file, try the approach on a small sample first, then work through
  the list in batches.
- For UI changes, run the app and look at the result (screenshot) before
  calling it done.
- Use logging, not print statements, outside of tests and CLI output.
- Markdown tables are space-padded so columns line up in plain text.

## Independent review

The author of a change is biased toward accepting it. For any non-trivial
change, get a review from a separate context (a subagent) before calling it
done:

- The reviewer gets the diff and the task description, not the author's
  reasoning.
- The reviewer is told to assume the code is wrong and find out why: bugs,
  edge cases, behaviour changes, rule violations from this file.
- The reviewer does not edit code. The author fixes each finding or explains
  why it does not apply.

## Subagents

- A subagent never spawns another subagent. This applies to every kind:
  coding agents, reviewers, researchers, fetchers.
- A coding subagent does not start its own reviewer; it finishes, reports,
  and the top-level agent decides on and starts the review.
- A reviewer does not start a second reviewer or a "verifier" of its own
  findings; it reports, and the top-level agent decides if more review is
  needed.
- If a subagent thinks more agents are needed, it says so in its report
  instead of spawning them.
- When the top-level agent spawns a subagent, it includes this rule in the
  subagent's instructions.

## Ask a human first

Do not decide these on your own:

- adding or upgrading a dependency;
- anything that costs money or uses paid services;
- pushing, publishing, releasing or deploying;
- destructive git operations (force push, reset, deleting branches);
- deleting files that are untracked or not yours;
- changes to public APIs, wire formats, or stored data formats;
- handling personal data or credentials.

Never put personal details (names, emails) into outgoing requests, headers or
user agents.

## Parallel agents

- One git worktree per agent. Edit only the files your task owns.
- Use separate build/output directories and ports per agent.
- If someone else's in-progress change breaks the build, wait and retry; do not
  fix their files.
- Never run git commands that touch other people's work: no `git stash`,
  `git reset`, `git checkout -- .`, `git clean`, `git add -A` or `git add .`.
  Stage and commit only the specific files you changed.
- Run heavy or slow commands (full builds, stress tests) with resource limits,
  and not from many agents at once.
- Clean up your worktree, build directory and temp files when done.

## Before you finish

- [ ] Build passes, formatter and linter are clean.
- [ ] Full test suite passes, and the tests actually ran. Bug fixes have a
      regression test.
- [ ] No stubs, placeholders or disabled checks left behind.
- [ ] Non-trivial changes had an independent review, findings addressed.
- [ ] New/changed text is ASCII only (see rule 1).
- [ ] No new dependencies without approval.
- [ ] Doc comments on new public functions; file header on new files.

## Project specifics

### Overview

Karopon is a self-hosted personal tracker for health, nutrition, fitness and
daily life: meals and nutrients, blood sugar and insulin, time tracking,
workouts, body metrics, goals, reminders, charts and data export. It is a Go
HTTP server with a Preact single-page UI embedded into the binary, backed by
PostgreSQL or SQLite. The Android app wraps the same Go server (as a JNI
library) and UI in a WebView. Users are individuals running their own
instance; see `README.md` for deployment.

### Layout

```
main.go                 CLI entry point (urfave/cli): `run` server, `db` subcommands
src/
  cmd/                  one file per CLI command (server, create user, sample data, ...)
  api/
    api.go              top-level router and server setup
    v1/                 REST endpoints, one per file: api_<scope>_<resource>_<verb>.go
    v1/router.go        registers every v1 endpoint
    auth/ userreg/      sessions, access tokens, user registry
    middleware/         CORS, no-cache, panic recovery
    ratelimit/          request rate limiting
  database/             DB interface, shared types, stats queries, migration runner
    postgres/           PostgreSQL implementation, one file per table/feature
    sqlite/             SQLite implementation (cgo: mattn, no cgo: modernc)
    migrations/{pg,sqlite}/  numbered *.up.sql files, never edit a shipped one
    database_test/      shared tests run against both backends
    mock_db/            mock DB for API tests
  constants/            limits, keys, cookie names
  assets/               static files served by the server
  ui/                   Preact + TypeScript + Tailwind, built by Vite
    serve.go            embeds ui/dist into the Go binary
    src/api/            typed API client and response types
    src/pages/<page>/   one directory per page
    src/components/     shared components
    src/platform/       Android bridge (window.Android* interfaces)
android/
  golib/                cgo/JNI wrapper that runs the Go server in-process
  app/                  Kotlin app (WebView, alarms, TTS, settings)
  scripts/              build/lint helpers, run inside the Android build container
docker/                 release image, goreleaser build image, Android build image
```

Backend layering: `cmd` -> `api` -> `database` -> `database/{postgres,sqlite}`.
`database` never imports `api`; `api` talks to the `database.DB` interface,
never to a concrete backend.

### Commands

Run from the repo root. Go and gcc run on the host. npm and golangci-lint run
in docker via the Makefile (images pinned there as `NODE_IMAGE` and
`GOLANGCI_IMAGE`); do not call them directly. The Android build uses the
container from `docker/Dockerfile.android.build` (`make docker-mount-android`).

```
check:    make check           every check below, read-only; must pass before a commit
          make -k check        keep going after a failure to see everything
setup:    make download-tools install-go install-js
build ui: make generate        (required once before any Go build or test:
                                src/ui/dist is embedded by //go:embed)
build:    make build-site
test:     make check-go-test   go test with CGO_ENABLED=0 and =1
          TEST_POSTGRES_DSN=... enables the Postgres tests (see .env)
lint go:  make check-go-lint   config in .golangci.yaml
lint ui:  make check-ui        tsc, eslint, prettier --check
ascii:    make check-ascii     tracked and new files, see rule 1
format:   make format          golangci-lint fmt + prettier --write
run:      make run             needs a database, see README.md
android:  cd android && gradle :app:lintDebug :app:assembleDebug (in container)
```

### UI development

```
make dev-api    Go API on 127.0.0.1:9070, SQLite data in data/dev (created
                with sample data on first run; rm -rf data/dev to reset)
make dev-ui     Vite dev server with hot reload on http://127.0.0.1:5173,
                proxies /api to dev-api
```

Run both as background processes. Open http://127.0.0.1:5173 and log in as
`dev` / `dev`. UI edits reload on save; Go changes need a dev-api restart.
Stop the UI container with `docker stop karopon-dev-ui`.

The `playwright` MCP server (`.mcp.json`) is a headless Chromium in docker on
the host network, so it reaches the dev servers at 127.0.0.1. Use it to check
every UI change:

- `browser_snapshot` returns the accessibility tree (roles, names, refs).
  Use it to drive the page and to check that every control has a role and
  an accessible name.
- `browser_take_screenshot` to look at layout and styling.
- `browser_resize` to check phone width (390x844, the Android WebView case)
  as well as desktop (1280x800).
- `browser_console_messages` for errors after each interaction.
- `browser_press_key` (Tab, Enter, Escape) to check keyboard use and focus.

The browser profile lasts only as long as the MCP server, so expect to log
in again in a new session.

CI (`.github/workflows/`) runs the Go tests against both SQLite builds and
Postgres 17, and Android lint + build.

### Language notes

Go:

- Log with zerolog (`github.com/rs/zerolog/log`), never `fmt.Print*`.
- Errors: wrap with context; compare with `errors.Is` / `errors.As`. Sentinel
  errors are package-level `Err...` vars. Match the error package the file
  already uses (`errors` or `github.com/pkg/errors`).
- Every DB feature is implemented in both `postgres/` and `sqlite/` and
  tested once in `database_test/` against both. A schema change needs a new
  migration in both `migrations/pg` and `migrations/sqlite`.
- Code must build with `CGO_ENABLED=0` and `CGO_ENABLED=1`; cgo-specific
  code goes in `*_cgo.go` / `*_nocgo.go` files with build tags.
- New endpoint: one file in `src/api/v1/`, one registration line in
  `router.go`, matching types in `src/ui/src/api/`.
- Lines max 120 columns (golines). The linter set in `.golangci.yaml`
  (gosec, err113, exhaustive, sqlclosecheck, ...) is the bar; do not add
  `//nolint` without a reason in the same comment.

UI (TypeScript / Preact):

- Strict TypeScript (`tsconfig.json`); no `any`; `type` not `interface`.
- Format with prettier (`.prettierrc`); lint rules live in `package.json`.
- Android-only behaviour goes through `src/platform/android.ts`, and must
  degrade cleanly in a normal browser.

Accessibility is a high priority. New or changed UI must be usable by
keyboard and screen reader: semantic elements, labels on every control,
visible focus, sufficient contrast, no information by colour alone.

Android (Kotlin):

- The app is a thin shell; product logic lives in the Go server and UI.
- `app/src/main/jniLibs/*/libgoserver.so` are gitignored build outputs of
  `android/scripts/build-go-lib.sh`; never edit or commit them.
