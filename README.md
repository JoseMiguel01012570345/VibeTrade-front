# VibeTrade frontend

React + TypeScript + Vite app.

## Arquitectura (Feature-Sliced Design)

- **`src/features/<Feature>/`** — código de dominio por funcionalidad (`pages/`, `components/`, `api/`, `model/`, `hooks/`, `index.ts` barrel).
- **`src/shared/`** — infra transversal: HTTP (`apiClient`, `sessionToken`), UI primitiva (`VtSelect`, `ConfirmModal`), media, tema, `cn`.
- **`src/app/`** — shell, router, bootstrap.
- **Estado global por feature:**
  - `features/auth/model/` — sesión, usuario, tema, notificaciones locales (`useAppStore`)
  - `features/market/model/store/` — catálogo, ofertas, feed, compositor Zustand (incl. slice de tiendas del dueño)
  - `features/chat/store/` — threads, mensajes, hojas de ruta

**Estado:** Zustand (sesión/UI global) + TanStack Query (servidor) + RxJS (UI intra-feature compleja, p. ej. rail de chat).

- **E2E (Playwright):** specs en `test/e2e/test-feats/` — flujos reales en navegador + API.
- **Unit (Vitest):** `npm run test:unit` / `npm run test:run` (cuando haya specs bajo `src/`).

## Tests

### Prerequisites (E2E)

1. `npm install`
2. Primera vez: `npx playwright install chromium`
3. Backend en `http://localhost:5110` con `Auth:ExposeDevCodes=true` (dev por defecto).
4. Datos de catálogo/feed en la base para que el `global-setup` pueda provisionar tienda, oferta y escenario de chat.

Playwright arranca `npm run dev` en `http://localhost:5173` salvo que uses `PLAYWRIGHT_SKIP_WEBSERVER=1` (útil si ya tienes Vite corriendo).

### Run all E2E tests

```bash
npm run test:e2e
```

`npm run test` es un alias de `test:e2e`.

Suite completa con UI interactiva:

```bash
npm run test:e2e:ui
```

### Run a specific test (recommended workflow)

Playwright filtra por **archivo**, **título** (`-g`) o **línea**. Usa siempre la ruta desde la raíz del frontend.

**Un archivo entero**

```bash
npx playwright test test/e2e/test-feats/Chat/chat-route-sheets.spec.ts
```

**Un solo caso por nombre (grep en el título del `test(...)`)**

```bash
npx playwright test test/e2e/test-feats/Chat/chat-route-sheets.spec.ts -g "system message"
```

**Un caso concreto por línea** (útil en el IDE: “Run at line”)

```bash
npx playwright test test/e2e/test-feats/Chat/chat-route-sheets.spec.ts:934
```

**Varios archivos de una carpeta**

```bash
npx playwright test test/e2e/test-feats/Chat/
```

**Ver el navegador mientras corre un test**

```bash
npx playwright test test/e2e/test-feats/Chat/chat-route-sheets.spec.ts -g "Delete route sheet" --headed
```

**Depurar paso a paso**

```bash
npx playwright test test/e2e/test-feats/Chat/chat-route-sheets.spec.ts -g "Delete route sheet" --debug
```

**Elegir el test en la UI de Playwright** (sin memorizar `-g`)

```bash
npx playwright test test/e2e/test-feats/Chat/chat-route-sheets.spec.ts --ui
```

En PowerShell las comillas de `-g` van con `"..."` como arriba.

### npm scripts

| Script         | Qué hace                          |
| -------------- | --------------------------------- |
| `npm run test` | E2E headless (alias de `test:e2e`) |
| `npm run test:e2e` | Playwright headless           |
| `npm run test:e2e:ui` | Playwright UI mode           |
| `npm run test:unit` | Vitest en watch              |
| `npm run test:run` | Vitest una sola pasada        |

### Global setup y sesión

Antes de los specs, `test/e2e/global-setup.ts`:

1. Registra **vendedor + comprador** vía UI, publica catálogo y guarda tokens en `test/e2e/.auth/`.
2. Opcionalmente provisiona un hilo con acuerdos aceptados para tests de hojas de ruta (`scenario.json`).
3. Inyecta `vt_session_token` en cada test.

Variables útiles:

| Variable | Efecto |
| -------- | ------ |
| `PLAYWRIGHT_E2E_TOKEN` | Token del comprador (salta registro UI del buyer) |
| `PLAYWRIGHT_E2E_SELLER_TOKEN` | Token del vendedor |
| `PLAYWRIGHT_E2E_SKIP_AUTH=1` | Sin auth; muchos specs se saltan |
| `PLAYWRIGHT_SKIP_WEBSERVER=1` | No levantar Vite; usar dev server ya activo |
| `PLAYWRIGHT_BASE_URL` | URL del frontend (default `http://localhost:5173`) |

Helpers compartidos: `test/e2e/Resources/` (`env.ts`, `e2e-chat-scenario.ts`, `route-sheet-ui-helpers.ts`, etc.).

### Layout de specs E2E

| Carpeta | Ejemplos |
| ------- | -------- |
| `Chat/` | `chat-route-sheets.spec.ts`, `chat-agreements.spec.ts`, `chat-messaging-realtime.spec.ts` |
| `Catalog/` | `catalog-search.spec.ts`, `catalog-owner.spec.ts` |
| `Home/` | `home-feed.spec.ts` |
| `Offers/` | `offers-save.spec.ts` |
| `Profile/` | `profile-account.spec.ts`, `profile-saved.spec.ts` |
| `Stores/` | `stores-crud.spec.ts` |
| `Vitrina/` | `store-vitrina.spec.ts` (público, sin auth) |
| `Notifications/` | `notifications-panel.spec.ts` |

Los specs de **chat con hojas de ruta** requieren escenario provisionado (`routeSheetThreadId` en `test/e2e/.auth/scenario.json`); si falla el setup, esos tests hacen `test.skip` con un mensaje explícito.

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
