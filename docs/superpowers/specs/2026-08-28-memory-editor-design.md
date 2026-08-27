# Memory files editor design

## Goal

Turn the Memory page into a focused editor for the two curated memory files that
AXIOM uses as internal context:

- `MEMORY.md` — durable, long-term context.
- `USER.md` — personal context about the signed-in user.

The page must show the actual authenticated user's file contents and let them
edit and save raw Markdown without converting it into structured memory records.

## Product experience

The page title becomes **Memory files** with supporting copy that explains these
documents are the context AXIOM uses about the user. The primary workspace is a
two-up editor on desktop and a stacked editor on smaller screens.

Each document panel contains:

- the filename as the panel heading;
- a short description of the document's purpose;
- a raw Markdown textarea with readable monospace typography;
- a compact line/character count for orientation.

The page header contains a single **Save all** action. It is disabled while the
documents match their last loaded/saved snapshot and enabled when either editor
is dirty. A secondary **Discard changes** action restores both editors to the
last loaded snapshot and requires confirmation when there are unsaved changes.

The header status communicates `Loading`, `Unsaved changes`, `Saving`, or
`Saved`. Successful saves update the baseline snapshot and show a toast. Empty
files are valid and can be saved; the UI must not treat an empty document as an
error.

If the user tries to leave the page with unsaved changes, the browser unload
warning is enabled. Errors are shown inline with a retry action and do not use
`window.alert()`.

## Backend contract

The intelligence service exposes one authenticated snapshot resource:

`GET /api/v1/internal-memory`

Response:

```json
{
  "user_markdown": "# About the user\n",
  "memory_markdown": "# Durable memory\n"
}
```

`PUT /api/v1/internal-memory`

Request:

```json
{
  "user_markdown": "# About the user\n",
  "memory_markdown": "# Durable memory\n"
}
```

The service derives `tenant_id` and `user_id` from the authenticated gateway
context. The client does not send scope identifiers. The service writes the
snapshot through `InternalMemoryManager`/`CuratedFileStore` and returns the
resulting snapshot. A single request is used for Save all so the UI cannot
report success after only one document has been persisted. The file store
stages the new UTF-8 contents before replacing the current files, preserving
the previous snapshot if staging fails.

The existing entry-oriented `/internal-memory/write` endpoint remains for
agent/runtime memory operations. It is not used by this page because replacing
an entire Markdown document is a different operation from adding, replacing,
or removing a delimiter-separated entry.

The service's CORS configuration must allow `GET`, `PUT`, and `OPTIONS` for
browser clients where cross-origin access is configured.

## Frontend structure

Replace the current inventory, recall/capture, experience, procedure, and ReMe
operations UI in `src/features/memory/MemoryPage.tsx` with a focused page made
of small local components:

- `MemoryPage` owns the snapshot, draft state, request state, dirty detection,
  load/save/discard handlers, and unload warning.
- `MemoryFileEditor` renders one labelled file panel and reports text changes.
- `MemoryFileStatus` renders the save state and action affordances.

The memory API module gains typed `getMemorySnapshot` and
`saveMemorySnapshot` functions plus a small snapshot type. Existing API helpers
can remain available for other consumers, but the Memory page should no longer
import the inventory-specific types or controls.

Use the existing Tailwind/shadcn stack and available Lucide icons. No new
dependency is needed. Keep the current application shell, route, theme, scope
bar, and page-height behavior intact.

## Data flow

1. Mounting the page calls `GET /internal-memory`.
2. The response becomes both the draft and the baseline snapshot.
3. Textarea input updates only the draft for its file.
4. Dirty state is the exact comparison of both draft strings to the baseline.
5. Save all sends both draft strings in one `PUT` request.
6. The response becomes the new baseline and draft, so server-normalized
   content is what remains visible.
7. A failed load or save leaves the current draft intact and exposes the error
   inline so the user can retry without losing work.

## Loading, empty, and error states

- Initial load uses two editor-shaped skeleton panels.
- A missing file renders an empty textarea with concise helper text, not an
  empty-page placeholder.
- Save errors identify that the changes were not saved and retain the draft.
- Retry reloads from the server only when there is no dirty draft; when a dirty
  draft exists, retrying save reuses the current text.
- The save button shows a disabled saving state while the request is pending.

## Accessibility and responsive behavior

- Each textarea has a visible label tied with `htmlFor`/`id`.
- The save state is announced with a polite live region.
- Buttons include visible focus rings and pressed/disabled states from the
  existing component system.
- Desktop uses two equal columns with independent vertical scrolling inside
  the page content area; mobile stacks panels with the save action remaining
  easy to reach near the header.
- The layout uses `min-height: 100dvh`-compatible app behavior and avoids a
  fixed viewport height inside the editor panels.

## Testing

Frontend tests cover:

- both filenames and loaded Markdown are rendered;
- editing either textarea enables Save all;
- Save all sends both documents and replaces the baseline on success;
- failed saves keep the draft and expose the error;
- empty documents can be saved;
- Discard changes restores the last loaded snapshot.

Backend tests cover:

- GET derives scope from the authenticated gateway context;
- PUT derives scope and returns both persisted files;
- PUT accepts empty document contents;
- invalid or unauthenticated requests are rejected according to existing API
  conventions.

## Out of scope

- Markdown preview or rich-text editing.
- Per-line memory classification, confidence, feedback, or ReMe controls.
- Version history, diff view, autosave, or conflict resolution.
- Changes to the application route or workspace navigation.
