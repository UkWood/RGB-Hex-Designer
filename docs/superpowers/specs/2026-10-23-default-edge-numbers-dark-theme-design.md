# Default edge numbers and dark theme — design

## Intent
New projects should start with edge numbering visible, and a user with no stored appearance preference should see the dark theme.

## Goals
- `showEdgeNumbers` is `true` for a newly created editor state.
- The initial appearance is `dark` when `rgb-hex-designer-theme` is absent or storage cannot be read.
- An explicitly stored appearance (`system`, `light`, or `dark`) continues to win over the fallback.
- Loaded project files keep their own saved view flags; migration semantics are not changed.

## Non-goals
- Do not force edge numbering on when loading an existing project that saved it off.
- Do not overwrite an existing stored appearance preference.
- Do not change layout, routing, calculations, or responsive behavior.

## Approach
There is one sensible low-risk approach: change the editor-state default for edge numbering and change the theme fallback in the V3 UI. Protect both behaviors with tests before changing production code. For the theme fallback, expose a small pure resolver used by the runtime so the test exercises behavior rather than source text.
