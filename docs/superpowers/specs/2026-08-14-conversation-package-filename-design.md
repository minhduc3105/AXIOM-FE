# Conversation-Based Workspace Package Filename Design

## Goal

Make the workspace-files package download identify the active chat conversation. The downloaded archive should use the format `package-session-<conversation-id>.zip`, for example `package-session-3321b1ff-7edd-452d-8095-6351f31d8f28.zip`.

## Root Cause

`ProcessInspectorAside` currently derives a value named `sessionId` by recursively searching process event inputs, outputs, and details for `session_id` or `sessionId`. The active conversation ID is already available in app routing/workflow state, but it is not passed into the inspector. When process events do not contain a session field, the derivation falls back to `session`, producing `package_session.zip`.

## Chosen Direction

Pass the active conversation ID explicitly through the existing component tree:

- `AppExperience` passes the current chat route session ID to `ChatPage`.
- `ChatPage` passes that value to `ProcessInspectorAside` as `conversationId`.
- `ProcessInspectorAside` uses `conversationId` first and only falls back to its existing event-derived ID when the prop is absent.
- `downloadWorkspaceFilesPackage` formats the filename as `package-session-<safe-id>.zip`.

This keeps the filename source explicit and preserves compatibility for inspector usage without an active route conversation.

## Data Flow

```text
route.sessionId
  -> AppExperience(ChatPage conversationId)
  -> ChatPage(ProcessInspectorAside conversationId)
  -> downloadWorkspaceFilesPackage(files, conversationId)
  -> package-session-<safe-id>.zip
```

## Error and Fallback Behavior

- A missing or blank conversation ID keeps the existing event-derived ID behavior.
- If neither source provides an ID, the safe fallback remains `session`.
- Existing filename sanitization remains in place so unsafe characters cannot produce path separators or invalid archive names.
- The download button's accessible label must match the actual filename format.

## Testing

- Add a focused unit test for the package filename formatter covering a conversation UUID and the fallback ID.
- Run the focused Vitest test and the frontend production build.
- Confirm no API or archive-content behavior changes.
