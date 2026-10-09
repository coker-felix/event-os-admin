# Event OS Admin

Admin dashboard monorepo built with React 19, Vite 6, Tailwind CSS v4, TanStack Router, Query, and Table, Zustand, and Playwright. The repository root owns the pnpm manifest, lockfile, and Vite project config; application source lives under `app/`.

## Getting started

```sh
pnpm install
pnpm dev
```

The admin app runs at the URL printed by Vite (usually `http://localhost:5173`).

## Repository layout

```text
index.html                Vite document entry
vite.config.ts            Vite, Tailwind, and TanStack Router plugins
tsconfig.json             Root TypeScript config and app import alias
app/
  src/
    routes/               File-based route tree
    components/           UI components and root layout
    types/                App and router context types
    styles/               Tailwind v4 theme tokens in globals.css
    router/               Router factory and route guards
    main.tsx               React entry point
e2e/                     Playwright browser tests
```

Vite runs from the repository root. Route files live under `app/src/routes`; TanStack Router's Vite plugin generates `app/src/routeTree.gen.ts` from them. The router factory, guards, UI, types, and styles all live under `app/src`.

## State boundaries

- **Server state:** TanStack Query. Put API requests and cache behavior in route loaders or query hooks.
- **Client state:** Zustand. Use it for local interface state such as sidebar preferences.
- **Route state:** TanStack Router search params and route context. Avoid duplicating URL state in Zustand.

## Commands

```sh
pnpm dev             # Start the admin app
pnpm build           # Build the dashboard
pnpm typecheck       # Type-check the dashboard
pnpm e2e             # Run Playwright tests (requires installed browser)
pnpm e2e:install     # Install Playwright Chromium
```

Theme tokens are CSS-first and live in `app/src/styles/globals.css` under `@theme`. Do not add a `tailwind.config.js` for theme configuration.
