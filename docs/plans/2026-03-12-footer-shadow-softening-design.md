# Footer Shadow Softening Design

**Goal:** Make the footer overlap feel softer so scrolling content fades into the footer area more gradually.

**Context:** The footer already uses a `::before` pseudo-element as a short gradient shadow above the card. The current effect is readable but still looks like a distinct band rather than a long fade.

## Chosen Approach

Add a second, wider pseudo-layer on the footer root while keeping the existing near-footer layer. The new layer acts as a high, pale haze that starts almost invisible and gently brightens toward the footer. The existing layer remains as the tighter contact shadow closest to the footer card.

## Why This Approach

- Preserves current component structure and overlay behavior.
- Produces a smoother "content slides under footer" transition than a single hard band.
- Keeps the footer card itself intact, so readability and layout do not change.

## Scope

- Modify only `src/widgets/footer/ui/app-footer.module.css`.
- No component logic changes.
- No test additions; verify with lint and existing automated tests.
