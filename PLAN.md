# Things 3 CLI - Test-Driven Development Plan

## Overview

Create a comprehensive standalone CLI tool (`things3`) for complete Things 3 interaction with robust rollback support.

**Location:** `~/Downloads/projects/things3-cli/`
**Binary destination:** `~/.tron/mods/things3` (after validation)

---

## TDD Approach

For each component, we follow strict Red-Green-Refactor:

1. **RED**: Write failing tests that define expected behavior
2. **GREEN**: Write minimal code to make tests pass
3. **REFACTOR**: Clean up while keeping tests green

### Testing Strategy

| Layer | Test Type | Mocking Strategy |
|-------|-----------|------------------|
| URL Builder | Unit | None needed - pure functions |
| Rate Limiter | Unit | Mock timers |
| Auth | Unit | Mock filesystem |
| AppleScript | Integration | Mock `exec` calls |
| Snapshot Repo | Integration | In-memory SQLite |
| Commands | Integration | Mock URL executor + AppleScript |
| E2E | System | Real Things 3 (manual/optional) |

---

## Implementation Phases

### Phase 1: Project Setup
```
1. Create project structure
2. package.json, tsconfig.json, .gitignore
3. Install dependencies (including test deps)
4. Create test utilities and mocks
```

### Phase 2: URL Builder (Pure Functions - Easiest to Test)
```
Tests first:
  - url-builder.test.ts
    - buildAddTodoUrl() with all parameter combinations
    - buildAddProjectUrl() with all parameters
    - buildUpdateUrl() with all parameters
    - buildUpdateProjectUrl() with all parameters
    - buildShowUrl() for lists and items
    - buildSearchUrl() with/without query
    - buildJsonUrl() for bulk operations
    - buildCompleteUrl() / buildCancelUrl()
    - Edge cases: special characters, empty values, max lengths

Then implement:
  - src/core/url-builder.ts
```

### Phase 3: Rate Limiter
```
Tests first:
  - rate-limiter.test.ts
    - Allows operations under limit (250)
    - Blocks when limit reached
    - Resets after window (10s)
    - getWaitTime() returns correct delay
    - acquire() waits appropriately
    - Multiple rapid calls handled correctly

Then implement:
  - src/core/rate-limiter.ts
```

### Phase 4: Auth Token Management
```
Tests first:
  - auth.test.ts
    - getAuthToken() returns null when no file
    - getAuthToken() returns token when file exists
    - setAuthToken() creates directory if needed
    - setAuthToken() writes with correct permissions (0o600)
    - clearAuthToken() removes file
    - hasAuthToken() returns correct boolean
    - maskToken() masks correctly
    - requireAuthToken() throws AuthRequiredError when missing

Then implement:
  - src/core/auth.ts
```

### Phase 5: Output Formatting
```
Tests first:
  - output.test.ts
    - Text output formatting
    - JSON output formatting
    - Table formatting
    - Color handling (with/without)
    - Quiet mode suppresses output
    - Snapshot info formatting

Then implement:
  - src/core/output.ts
```

### Phase 6: Database Layer
```
Tests first:
  - db/connection.test.ts
    - Creates database file if missing
    - Returns same instance on multiple calls
    - withTransaction() commits on success
    - withTransaction() rolls back on error

  - db/migrations.test.ts
    - Creates all required tables
    - Creates all indexes
    - Idempotent (can run multiple times)

  - db/snapshot-repo.test.ts
    - generateSnapshotId() format is correct
    - createSnapshot() inserts record
    - addSnapshotCreated() links to snapshot
    - addSnapshotModified() stores previous state as JSON
    - addSnapshotStatus() records status change
    - getSnapshot() returns null for missing
    - getSnapshot() returns correct data
    - getSnapshotDetails() includes all related records
    - listSnapshots() pagination works
    - listSnapshots() filtering by status works
    - updateSnapshotStatus() updates correctly
    - deleteSnapshot() removes cascade
    - purgeOldSnapshots() removes old records only

Then implement:
  - src/db/connection.ts
  - src/db/migrations.ts
  - src/db/snapshot-repo.ts
```

### Phase 7: URL Executor (Mocked)
```
Tests first:
  - url-executor.test.ts
    - executeUrl() calls `open` with correct URL
    - executeUrl() returns success on clean exit
    - executeUrl() returns error on failure
    - executeUrl() respects rate limiter
    - isThingsInstalled() detects installation
    - isThingsRunning() detects running state

Then implement:
  - src/core/url-executor.ts
```

### Phase 8: AppleScript Queries (Mocked)
```
Tests first:
  - applescript.test.ts
    - getThingsVersion() parses version correctly
    - queryList() returns items for each list type
    - queryById() returns item or null
    - queryByTag() filters correctly
    - queryProject() returns project items
    - getAllProjects() returns all projects
    - getAllAreas() returns all areas
    - Handles errors gracefully

Then implement:
  - src/core/applescript.ts
```

### Phase 9: Snapshot Manager Service
```
Tests first:
  - services/snapshot-manager.test.ts
    - createAddSnapshot() creates correct records
    - createUpdateSnapshot() captures previous state
    - createCompleteSnapshot() records status change
    - rollbackAddSnapshot() cancels created items
    - rollbackUpdateSnapshot() restores previous state
    - rollbackCompleteSnapshot() (warns: cannot un-complete)
    - Handles partial rollback failures

Then implement:
  - src/services/snapshot-manager.ts
```

### Phase 10: Things Client Service
```
Tests first:
  - services/things-client.test.ts
    - addTodo() builds URL and executes
    - addProject() builds URL and executes
    - updateTodo() requires auth, builds URL
    - updateProject() requires auth, builds URL
    - completeTodo() marks complete
    - cancelTodo() marks canceled
    - show() navigates correctly
    - search() opens search
    - bulkJson() handles array of operations

Then implement:
  - src/services/things-client.ts
```

### Phase 11: Commands (Integration Tests)
```
For each command, test:
  - Parses all CLI options correctly
  - Validates required parameters
  - Calls correct service methods
  - Formats output correctly (text + JSON)
  - Creates snapshots when appropriate
  - Handles errors gracefully

Commands in order:
  1. show.ts (simplest, no state change)
  2. search.ts (simple, no state change)
  3. version.ts (simple, read-only)
  4. auth.ts (setup, set, show, clear, test)
  5. add.ts (creates snapshot)
  6. add-project.ts (creates snapshot)
  7. update.ts (requires auth, creates snapshot)
  8. update-project.ts (requires auth, creates snapshot)
  9. complete.ts (requires auth, creates snapshot)
  10. cancel.ts (requires auth, warning about irreversibility)
  11. query.ts (read-only, various filters)
  12. json.ts (bulk operations, complex snapshot)
  13. snapshots.ts (list, show, delete, purge)
  14. rollback.ts (executes rollback)
```

### Phase 12: CLI Integration
```
Tests first:
  - cli.test.ts
    - All commands registered
    - Global options work (--json, --quiet, --verbose)
    - Help text is correct
    - Version is correct
    - Unknown commands error gracefully

Then implement:
  - src/cli.ts
  - src/index.ts
```

### Phase 13: Build & Installation
```
1. Build binary with bun
2. Run all tests against binary
3. Install to ~/.tron/mods/
4. Verify installation
```

---

## File Structure

```
~/Downloads/projects/things3-cli/
├── package.json
├── tsconfig.json
├── bun.lockb
├── .gitignore
├── PLAN.md
│
├── src/
│   ├── index.ts
│   ├── cli.ts
│   ├── config.ts
│   │
│   ├── core/
│   │   ├── url-builder.ts
│   │   ├── url-executor.ts
│   │   ├── applescript.ts
│   │   ├── auth.ts
│   │   ├── rate-limiter.ts
│   │   └── output.ts
│   │
│   ├── db/
│   │   ├── connection.ts
│   │   ├── migrations.ts
│   │   └── snapshot-repo.ts
│   │
│   ├── services/
│   │   ├── snapshot-manager.ts
│   │   └── things-client.ts
│   │
│   ├── commands/
│   │   ├── add.ts
│   │   ├── add-project.ts
│   │   ├── update.ts
│   │   ├── update-project.ts
│   │   ├── complete.ts
│   │   ├── cancel.ts
│   │   ├── show.ts
│   │   ├── search.ts
│   │   ├── json.ts
│   │   ├── query.ts
│   │   ├── version.ts
│   │   ├── rollback.ts
│   │   ├── snapshots.ts
│   │   └── auth.ts
│   │
│   └── types/
│       ├── things.ts
│       ├── snapshot.ts
│       └── output.ts
│
├── tests/
│   ├── setup.ts              # Test utilities, mocks
│   ├── mocks/
│   │   ├── exec.ts           # Mock child_process.exec
│   │   ├── fs.ts             # Mock filesystem
│   │   └── things.ts         # Mock Things 3 responses
│   │
│   ├── core/
│   │   ├── url-builder.test.ts
│   │   ├── url-executor.test.ts
│   │   ├── applescript.test.ts
│   │   ├── auth.test.ts
│   │   ├── rate-limiter.test.ts
│   │   └── output.test.ts
│   │
│   ├── db/
│   │   ├── connection.test.ts
│   │   ├── migrations.test.ts
│   │   └── snapshot-repo.test.ts
│   │
│   ├── services/
│   │   ├── snapshot-manager.test.ts
│   │   └── things-client.test.ts
│   │
│   └── commands/
│       ├── add.test.ts
│       ├── add-project.test.ts
│       ├── update.test.ts
│       ├── update-project.test.ts
│       ├── complete.test.ts
│       ├── cancel.test.ts
│       ├── show.test.ts
│       ├── search.test.ts
│       ├── json.test.ts
│       ├── query.test.ts
│       ├── version.test.ts
│       ├── rollback.test.ts
│       ├── snapshots.test.ts
│       └── auth.test.ts
│
└── dist/
    └── things3
```

---

## Test Utilities (tests/setup.ts)

```typescript
// Temporary directories for tests
// In-memory SQLite for database tests
// Mock exec for AppleScript/URL tests
// Mock filesystem for auth tests
// Snapshot testing helpers
// Output capture for CLI tests
```

---

## Definition of Done (per component)

- [ ] All tests written and failing (RED)
- [ ] Implementation makes tests pass (GREEN)
- [ ] Code refactored for clarity (REFACTOR)
- [ ] No TypeScript errors
- [ ] Edge cases covered
- [ ] Error handling tested

---

## Definition of Done (project)

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] `bun run build` succeeds
- [ ] `bun run test` passes
- [ ] Binary works from command line
- [ ] Manual smoke test with real Things 3
- [ ] Installed to ~/.tron/mods/things3

---

## Questions Before Starting

1. **Test coverage target?** (suggested: 90%+)
2. **Include E2E tests with real Things 3?** (requires Things 3 installed)
3. **Mock strategy preference?** (bun's built-in mocking vs manual mocks)
4. **Any commands to prioritize first?**
