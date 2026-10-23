# 0012. Establish Tailwind and Kobalte as the Solid UI foundation

- Status: Accepted
- Date: 2026-10-24
- Related: [ADR-0002](0002-solidjs-앱을-cloudflare-workers에서-pnpm으로-운영.md), [ADR-0009](0009-adopt-quail-blue-palette-and-simplified-favicon.md), [ADR-0013](0013-adopt-pretendard-for-ui-font.md)

## Context

The application is a SolidJS SPA on Cloudflare Workers. The user selected Tailwind CSS with Kobalte for UI work. Authentication UI needs accessible form interactions while keeping layout and visual styling in the existing Quail palette. This is a UI foundation decision; it does not change the colors or favicon selected by ADR-0009.

The dependency lock resolves solid-js 1.9.17, @kobalte/core 0.13.14, tailwindcss 4.3.3, @tailwindcss/vite 4.3.3, @solidjs/testing-library 0.8.10, and jsdom 30.1.3. The UI uses shared Button and PasswordField components. Test and implementation evidence is tracked in docs/design-system.md.

## Decision

- Use Tailwind CSS 4.3.3 and @tailwindcss/vite 4.3.3 for CSS layout and visual styling.
- Use Kobalte 0.13.14 for accessible interactive behavior and primitives in Solid UI.
- Keep imports from external UI component packages inside src/ui/**. Application use cases, domain policy, and infrastructure adapters must not depend on Kobalte or browser presentation components.
- Keep the generated palette asset as the canonical source for Quail tokens. The current app copies values into --palette-color-* in src/style.css and maps them through @theme inline; this is a manual mirror, not a direct import or automatically generated copy. When palette values change, update the generated asset and app copy together and review both.
- Follow the shared component, Korean typography, and responsive screen conventions in docs/design-system.md.

## Consequences

- UI styling and accessible interaction have separate responsibilities while the app keeps its SolidJS and layered boundaries.
- Reusable Kobalte wrappers keep semantics and focus behavior consistent; Tailwind utilities keep presentation close to UI components.
- Tailwind theme integration must consume semantic palette tokens rather than introduce new brand colors.
- This decision complements ADR-0009 and does not supersede its palette or favicon decisions.

## Alternatives considered

- Hand-built interactions without Kobalte: would require each component to implement and maintain keyboard, focus, and accessibility behavior.
- A pre-styled component library: was not selected; Kobalte supplies accessible primitives while the project keeps its own visual system.
