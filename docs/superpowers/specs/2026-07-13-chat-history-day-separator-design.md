# Chat history day separator

Replace the literal dash characters around each profile-popover history date with a single semantic separator row. The row keeps the existing lowercase, monospaced date centered between two thin CSS border lines using the current border and muted-text colors.

The date remains visible and becomes the separator's accessible label. No new component, dependency, behavior, or data change is needed.

Verification: the focused chat-panel test confirms the literal dash text is gone and the separator remains labeled by its date.
