# Footer Shadow Softening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Soften the footer overlap effect so content transitions into the footer more gradually.

**Architecture:** Keep the existing footer structure and overlay state. Extend the footer root with a broader pale gradient layer and tune the existing near-footer gradient so the combined effect reads as a long, soft fade instead of a sharp shadow band.

**Tech Stack:** CSS Modules, Next.js, Vitest, ESLint

---

### Task 1: Adjust footer overlap styling

**Files:**
- Modify: `src/widgets/footer/ui/app-footer.module.css`

**Step 1: Update the far fade layer**

Increase the height and spread of the footer root pseudo-element so it creates a pale, extended fade above the footer.

**Step 2: Add a near-contact layer**

Use a second pseudo-element for the tighter, denser transition immediately above the footer card.

**Step 3: Keep the footer card stable**

Do not change spacing, layout, or component markup unless strictly needed for the fade effect.

### Task 2: Verify

**Files:**
- Test: `src/widgets/footer/ui/app-footer.module.css`

**Step 1: Run lint**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24.14.0 >/dev/null && npm run lint`
Expected: PASS

**Step 2: Run tests**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24.14.0 >/dev/null && npm test`
Expected: PASS
