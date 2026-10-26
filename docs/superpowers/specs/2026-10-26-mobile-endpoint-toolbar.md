# Mobile endpoint toolbar design

## Intent

Fix the smartphone workflow for manual START/END selection. Endpoint-selection actions are editor tools because they immediately require interaction with the canvas; they must not live inside the parameters drawer that obscures the canvas.

## Approved layout

The persistent editor toolbar contains: `Отменить · Вернуть · Удалить · Вписать · AUTO · START · END`.

- `AUTO` resets endpoint selection to automatic START/END.
- `START` enters manual START selection mode.
- `END` enters manual END selection mode.
- Existing IDs and endpoint-selection behavior remain unchanged so state/routing logic is untouched.
- On narrow screens these controls remain available while the canvas is visible.

The route playback row contains step navigation/slider plus three compact icon-only actions:

- `⏵` — start route animation (`aria-label`/`title`: `Анимация маршрута`).
- `⏸` — pause route animation (`aria-label`/`title`: `Пауза анимации`).
- `⏭` — immediately show the complete route (`aria-label`/`title`: `Показать весь маршрут`).

The icon buttons must be compact but keep a touch target suitable for phones. No external icon library is introduced.

## Behavior constraints

- Moving buttons must not change routing, endpoint validation, project JSON, animation timing, or route-step logic.
- `START`/`END` active-state highlighting and mode banner remain functional.
- `AUTO` cancels manual pick mode exactly as before.
- `Показать весь маршрут` continues to set `routeStep` to the final traversal; only its presentation changes.
- Parameters drawer remains for parameters only; the three endpoint actions are no longer inside the routing section.

## Approaches considered

1. **Move existing controls in V3 UI augmentation — selected.** Preserve the stable IDs/event listeners created by `editor-ui.js`, then reparent `AUTO/START/END` into a dedicated toolbar group. Lowest behavioral risk.
2. Duplicate mobile-only endpoint buttons. Rejected because duplicate IDs/listeners create synchronization and accessibility problems.
3. Keep controls in the drawer and auto-close it after a click. Rejected because it preserves the conceptual problem and adds drawer-state coupling to editor modes.

For playback controls, keep existing buttons/functions and change only their markup/accessibility presentation; do not add a new playback component.
