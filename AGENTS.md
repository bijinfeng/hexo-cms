# Hexo CMS Repository Instructions

For full project context, architecture, and product notes, read:

- `docs/ai/project-context.md`

## Utility Library Preference

- `es-toolkit` is installed for shared utility use across this workspace.
- Prefer `es-toolkit` for general-purpose array/object/string/collection helpers when JavaScript built-ins are not enough.
- Before writing a new helper function, first check whether `es-toolkit` already provides the behavior.
- Only hand-write a helper when the logic is clearly domain-specific to Hexo CMS or when a local implementation is meaningfully clearer.
- Avoid adding one-off wrappers around behavior that `es-toolkit` already provides.
