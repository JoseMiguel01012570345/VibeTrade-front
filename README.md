# VibeTrade frontend

React + TypeScript + Vite app. Unit tests use Vitest; browser E2E uses Playwright under `test/e2e/test-feats/`.

### Run all tests

With the backend API on `http://localhost:5110`:

```bash
npm run test
```

Runs Vitest (`test:run`) then Playwright E2E (`test:e2e`). For unit tests only: `npm run test:unit` (watch) or `npm run test:run` (single run).

## E2E tests (Playwright)

Playwright specs live in `test/e2e/test-feats/`. Most tests are **integration E2E**: they hit the real API and browser. Auth and offer/store ids are resolved automatically when possible.

### Prerequisites

1. Install dependencies: `npm install`
2. Install Playwright browsers (first time only): `npx playwright install chromium`
3. Start the **backend API** on `http://localhost:5110` with `Auth:ExposeDevCodes=true` (default in dev `appsettings`).
4. Ensure the database has feed/search data (offers and recommended stores) so discovery helpers can find links on `/home`.

Playwright starts `npm run dev` on `http://localhost:5173` unless `PLAYWRIGHT_SKIP_WEBSERVER=1`.

### Run (recommended)

With the API running:

```bash
npm run test:e2e
```

**What happens automatically**

1. `global-setup.ts` calls `POST /api/v1/auth/request-code` and `verify` (same flow as backend integration tests, using `devMockCode`).
2. If `PLAYWRIGHT_E2E_PHONE` is unset, a new test user is registered with a random `+549…` number.
3. If `PLAYWRIGHT_E2E_PHONE` is set, that user is logged in (or registered if missing).
4. The session is saved to `test/e2e/.auth/session.json` and injected into each test via `sessionStorage` (`vt_session_token`).
5. Tests that need an offer or store id read them from `/home` when env overrides are not set.

The public vitrina spec runs without auth even if the API is down.

### npm scripts

| Script         | Command               |
| -------------- | --------------------- |
| Unit + E2E     | `npm run test`        |
| Unit (watch)   | `npm run test:unit`   |
| Unit (once)    | `npm run test:run`    |
| Headless E2E   | `npm run test:e2e`    |
| Interactive UI | `npm run test:e2e:ui` |

Single file:

```bash
npx playwright test test/e2e/test-feats/Home/home-feed.spec.ts
```

### Test suites

| Area            | Spec file                         | Auth                        |
| --------------- | --------------------------------- | --------------------------- |
| Catalog search  | `Catalog/catalog-search.spec.ts`  | Auto                        |
| Home feed       | `Home/home-feed.spec.ts`          | Auto; discovers offer/store |
| Offers save     | `Offers/offers-save.spec.ts`      | Auto; discovers offer       |
| Profile account | `Profile/profile-account.spec.ts` | Auto                        |
| Profile saved   | `Profile/profile-saved.spec.ts`   | Auto; discovers offer       |
| Profile stores  | `Stores/stores-profile.spec.ts`   | Auto                        |
| Store vitrina   | `Vitrina/store-vitrina.spec.ts`   | None (public)               |

Key files: `test/e2e/global-setup.ts`, `test/e2e/Resources/e2e-api.ts`, `test/e2e/Resources/e2e-discovery.ts`, `test/e2e/Resources/env.ts`.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json", "./tsconfig.app.json"],
    tsconfigRootDir: __dirname,
  },
};
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
