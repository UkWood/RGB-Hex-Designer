# Responsive Editor UX Design

## Intent

Turn RGB-Hex-Designer from a clean desktop-oriented web form into a compact engineering editor whose canvas remains the primary working surface on desktop, tablet, and mobile. Preserve the current routing, geometry, project format, PDF export, and calculation behavior.

## Goals

- Keep the existing light/dark visual language and semantic route colors.
- Make the canvas visually dominant and reduce form/dashboard feel.
- Keep two-column editor + sidebar only on sufficiently wide desktop screens.
- On tablet and mobile, keep the canvas in view while parameters open in a drawer/sheet instead of forcing long page scrolling.
- Move geometry values out of the action toolbar and group controls by user intent.
- Separate display options from routing controls.
- Make START, END, and delete modes visibly explicit.
- Increase SVG touch hit targets without making visible controls oversized.
- Distinguish editable inputs from calculated outputs.
- Replace the two-option optimization select with a directly visible segmented control while preserving the underlying select/state interface.
- Move project-level file actions into the editor header on wide screens and into a compact project-actions area on narrow screens.
- Add an explicit System / Light / Dark appearance selector without breaking `prefers-color-scheme` as the default.
- Preserve stable control IDs and existing application state APIs wherever possible.

## Non-goals

- No routing algorithm changes.
- No geometry/model/schema migration.
- No framework migration; keep standalone vanilla HTML/CSS/JS.
- No changes to PDF content rules beyond moving the UI control.
- No merge to `main` until explicit user approval after manual verification.

## Constraints

- The standalone `index.html` build must continue to work without a server or network dependency.
- Existing JSON v1/v2/v3 compatibility must remain intact.
- Existing IDs used by tests and state bindings must remain available even if their visual presentation changes.
- Primary touch targets should be at least 44 CSS px; SVG add controls should expose an invisible 48–52 px hit area.
- Desktop layout breakpoint for persistent sidebar should move above the current tablet range (target: 1080 px).
- Mobile layout must remain usable down to approximately 320 CSS px.

## Information architecture

### Header

- Product identity and editable project name are combined into one compact top area.
- Project-level actions (save, open, export PDF) live in the header on wide screens.
- Status and appearance control are global, not buried in parameter sections.

### Canvas toolbar

Contains only actions on the current view/geometry: Undo, Redo, Delete mode, Clear, Fit, orientation. Required dimensions are removed from the toolbar.

### Parameter groups

1. **Геометрия** — orientation summary, required width/height, segments per edge, correction, calculated base/final edge lengths.
2. **Трассировка** — optimization choice, AUTO START/END, assign START, assign END, full route.
3. **Лента и питание** — LED/m, W/m, voltage, PSU reserve.
4. **Отображение** — hex numbers, edge numbers, route step numbers, diagnostics.
5. **Расчёт** — current computed metrics and warnings.
6. **Подключение** — existing electrical guidance.

### Responsive behavior

- `>1080px`: persistent right sidebar.
- `<=1080px`: single full-width editor canvas; parameters open as an overlay drawer/sheet controlled by a persistent “Параметры” button.
- `<=760px`: compact header and toolbar, bottom editor navigation/action strip, drawer occupies most of the viewport height/width.
- `<=380px`: single-column form controls inside the drawer.

## Interaction details

- Active delete/START/END modes show a visible mode banner over the canvas with a short instruction and cancellation affordance.
- Clear remains immediately reversible through Undo; avoid blocking confirmation dialogs.
- Read-only computed values render as output/metric rows rather than editable-looking inputs.
- Segmented optimization control mirrors the existing select value so routing state code remains unchanged.
- Appearance selector stores a small local preference and supports `system`, `light`, and `dark`.
- Drawer closes via close button and Escape; opening/closing must not mutate project state.

## Accessibility and touch

- Preserve keyboard access to add-face controls.
- Keep focus-visible outlines.
- Label drawer controls and mode banner appropriately.
- Invisible SVG hit circles must not change visual geometry but must enlarge the touch target.
- Buttons and form controls remain at least 44 px high on touch layouts.

## Approaches considered

1. **Full markup rewrite in `editor-ui.js`** — cleanest long-term DOM, but high regression risk because legacy IDs and V3 augmentation are tightly coupled.
2. **Progressive V3 composition over stable legacy controls** — reuse existing state/event bindings, move/group existing DOM nodes after mount, and add new presentation controls. Lowest functional risk and preserves standalone compatibility.
3. **Framework migration** — rejected; unnecessary for a focused UX refactor and conflicts with the standalone/no-dependency character of the project.

Chosen approach: **progressive V3 composition**. It changes presentation and responsive behavior while leaving routing/state internals largely untouched.