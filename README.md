# Things 3 CLI

A comprehensive command-line interface for Things 3 task management with rollback support. Designed for automation and agent use.

## Installation

```bash
# Build
bun run build

# Install to ~/.tron/mods/
bun run install-cli

# Add to PATH (add to ~/.zshrc)
export PATH="$HOME/.tron/mods:$PATH"
```

## Authentication

Some operations (update, complete, cancel) require an auth token from Things 3.

### Default Token (Tron Account)

The CLI uses `~/.tron/auth.json` by default. Set up once:

1. Open Things 3 → Settings → General
2. Enable "Things URLs"
3. Copy the auth token

```bash
things3 auth setup YOUR_TOKEN_HERE
things3 auth show    # Verify it's set
things3 auth test    # Test the token
```

### Using a Different Token

To override the default token for a single command, use `--auth-token`:

```bash
things3 complete <id> --auth-token "OTHER_TOKEN"
```

Read-only operations (query, get, search) don't require auth.

## Commands

### Reading Data

```bash
# Query items
things3 query                      # Today's items (default)
things3 query --list inbox         # Items in inbox
things3 query --list today         # Today's items
things3 query --tag "work"         # Items with tag
things3 query --project <id>       # Items in project
things3 query --area <id>          # Items in area
things3 query --deadlines          # Items with deadlines
things3 query --repeating          # Repeating items

# List all
things3 query --projects           # All projects
things3 query --areas              # All areas
things3 query --tags               # All tags

# Get single item with full details
things3 get <id>

# Navigate in Things app
things3 show today
things3 show inbox
things3 show tomorrow
things3 show deadlines
things3 show repeating
things3 show all-projects
things3 show <item-id>

# Search
things3 search "meeting"
```

### Creating Items

```bash
# Add to-do
things3 add "Buy groceries"
things3 add "Call mom" --when today
things3 add "Review PR" --when tomorrow --deadline 2024-01-20
things3 add "Task" --tags "work,urgent" --checklist "Step 1,Step 2"
things3 add "Task" --list "Project Name" --heading "Section"
things3 add "Task" --notes "Additional details here"

# Add project
things3 add-project "New Feature"
things3 add-project "Q1 Goals" --area "Work" --deadline 2024-03-31
things3 add-project "Project" --tags "priority" --notes "Description"
```

### Updating Items (requires auth)

```bash
# Update to-do
things3 update <id> --title "New title"
things3 update <id> --when tomorrow
things3 update <id> --deadline 2024-02-01
things3 update <id> --tags "new,tags"        # Replace tags
things3 update <id> --add-tags "extra"       # Add tags
things3 update <id> --notes "New notes"      # Replace notes
things3 update <id> --append "More info"     # Append to notes
things3 update <id> --prepend "Important: "  # Prepend to notes
things3 update <id> --list "Other Project"   # Move to project
things3 update <id> --duplicate              # Duplicate then update

# Update project
things3 update-project <id> --title "Renamed"
things3 update-project <id> --area "Personal"
things3 update-project <id> --deadline 2024-06-01
things3 update-project <id> --add-tags "priority"
```

### Completing/Canceling (requires auth)

```bash
things3 complete <id>              # Mark complete
things3 cancel <id>                # Mark canceled (IRREVERSIBLE!)
things3 cancel <id> --force        # Skip confirmation
```

### Bulk Operations

```bash
# JSON command for bulk operations
things3 json '[{"type":"to-do","attributes":{"title":"Task 1"}},{"type":"to-do","attributes":{"title":"Task 2"}}]'
```

### Rollback Support

Every create/update operation creates a snapshot for rollback:

```bash
things3 snapshots list             # List snapshots
things3 snapshots show <id>        # Show snapshot details
things3 rollback <snapshot-id>     # Rollback changes
things3 snapshots purge --days 30  # Clean old snapshots
```

## Global Options

```bash
--json              # Output as JSON (for programmatic use)
--dry-run           # Show what would happen without executing
--quiet             # Suppress non-essential output
--no-color          # Disable colored output
--auth-token <tok>  # Override auth token for this command
```

## JSON Output

All commands support `--json` for structured output:

```bash
things3 query --projects --json
things3 get <id> --json
things3 add "Task" --json
```

## Important Limitations

### Areas Must Be Managed Manually

**Things 3's URL scheme does not support creating, updating, or deleting Areas.**

You must create and manage Areas directly in the Things 3 app:
- Open Things 3
- Right-click in the sidebar → "New Area"
- Or use File → New Area

Once created, you can:
- Query areas: `things3 query --areas`
- Query items in an area: `things3 query --area <id>`
- Create projects in an area: `things3 add-project "Name" --area "Area Name"`
- Move projects to an area: `things3 update-project <id> --area "Area Name"`

### Tags Must Be Created Manually

Tags are created automatically when you first use them, but the URL scheme doesn't support deleting tags. Manage tags in the Things 3 app.

### Cancel is Irreversible

The `cancel` command marks items as canceled, which **cannot be undone** even with rollback. Use with caution.

## Storage Locations

| Data | Location |
|------|----------|
| Auth token | `~/.tron/auth.json` (under `things3.authToken`) |
| Snapshots DB | `~/.tron/db/things3.db` |
| Binary | `~/.tron/mods/things3` |

## For Agents

This CLI is designed for agent/automation use:

1. **Structured output**: Use `--json` for all commands
2. **Full CRUD**: Create, read, update todos and projects
3. **Safe operations**: Snapshots enable rollback of mistakes
4. **Rate limiting**: Built-in (250 calls per 10 seconds)
5. **Comprehensive queries**: Filter by list, tag, project, area, deadlines, etc.

Example agent workflow:

```bash
# Get current tasks
things3 query --list today --json

# Add a task
things3 add "Agent-created task" --when today --json

# Get the snapshot ID from output, store for potential rollback
# Later, if needed:
things3 rollback <snapshot-id>
```

## Development

```bash
bun install          # Install dependencies
bun test             # Run tests
bun run typecheck    # Type check
bun run build        # Build binary
```

## License

MIT
