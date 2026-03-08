# FinTrack

## Current State
The app is fully built as a light-themed PWA personal finance manager. The theme is hard-coded as light in `index.css` with OKLCH tokens defined only for light mode. There is no dark mode CSS, no theme toggle, and no persisted theme preference. The Settings page (`SettingsPage.tsx`) has sections for Entry Mode, Category Management, Daily Reminder, and Backup.

## Requested Changes (Diff)

### Add
- Dark mode CSS token set in `index.css` under `.dark` class selector, mirroring all OKLCH variables with dark-appropriate values.
- A `ThemeContext` (React context + provider) in `src/lib/theme.ts` that reads/writes the theme preference from IndexedDB settings (`getSetting`/`setSetting` with key `"theme"`), applies `"dark"` class to `<html>`, and exposes `theme` + `setTheme`.
- A new "Appearance" settings section in `SettingsPage.tsx` with a Sun/Moon icon and a toggle between Light and Dark mode.
- `ThemeProvider` wrapping `App` in `main.tsx`.

### Modify
- `index.css`: add `.dark { ... }` block with dark OKLCH tokens; change `html { color-scheme: light; }` to be dynamic via `.dark { color-scheme: dark; }`.
- `App.tsx`: bottom nav and Toaster inline styles updated to use CSS variables instead of hard-coded `oklch(...)` values so they respond to theme changes.
- `SettingsPage.tsx`: import and use `useTheme` hook; add Appearance section with Sun/Moon toggle above the Entry Mode section.

### Remove
- Nothing removed.

## Implementation Plan
1. Add dark mode token block to `index.css`.
2. Create `src/lib/theme.ts` with `ThemeProvider` + `useTheme` hook backed by IndexedDB `getSetting`/`setSetting`.
3. Wrap `App` with `ThemeProvider` in `main.tsx`.
4. Update `App.tsx` bottom nav and Toaster to use CSS variable-based colors.
5. Add Appearance section (Light/Dark toggle) to `SettingsPage.tsx`.
