---
name: diff-review
description: Open a requested Git diff in Hunk. Use when the user asks to review, inspect, open, or show a working-tree, staged, latest-commit, or revision-range diff with Hunk.
---

# Diff Review

Confirm that `hunk` exists. Select one direct command:

- Working tree: `hunk diff`
- Staged changes: `hunk diff --staged`
- Latest commit: `hunk show`
- Explicit commit: `hunk show <ref>`
- Revision range: `hunk diff <range>`, for example `hunk diff main...HEAD`

Put requested pathspecs after `--`. Add `--watch` only when the user asks for a live working-tree view. If the scope is ambiguous, ask one question at a time.

Reject refs, ranges, or pathspecs that contain newlines. Quote every user-provided argument before you build a shell command.

## Herdr

First test `[ "${HERDR_ENV:-}" = 1 ]`. If true:

1. Run `herdr pane list`.
2. Parse the one pane whose `focused` field is true. Use its `workspace_id` and `foreground_cwd`, or use `cwd` when `foreground_cwd` is empty. Do not guess IDs.
3. Run `herdr tab create --workspace "$WORKSPACE_ID" --label "Hunk: <scope>" --no-focus`.
4. Parse `result.tab.tab_id` and `result.root_pane.pane_id` from that response.
5. Run the safely quoted equivalent of `cd <focused-cwd> && exec hunk ...` with `herdr pane run "$PANE_ID" "$COMMAND"`.
6. Only after the command starts, run `herdr tab focus "$TAB_ID"`.

Create the tab in the focused pane's workspace so it stays adjacent to the project context. Read fresh IDs from each JSON response because Herdr IDs can compact.

## Other terminals

Do not start the Hunk TUI in a non-interactive agent shell. If the host cannot hand the command to the user's interactive terminal, state this limit and print the exact quoted command for the user to run. If the host supports a true interactive terminal handoff, run that command there.
