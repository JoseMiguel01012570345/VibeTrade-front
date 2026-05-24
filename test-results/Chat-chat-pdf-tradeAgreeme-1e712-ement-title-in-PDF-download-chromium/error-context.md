# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Chat\chat-pdf.spec.ts >> tradeAgreementPdfDownload E2E >> plain document includes agreement title in PDF download
- Location: test\e2e\test-feats\Chat\chat-pdf.spec.ts:25:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-chat-interactive]').filter({ hasText: 'E2E PDF 1779601980568' })
Expected: visible
Timeout: 25000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 25000ms
  - waiting for locator('[data-chat-interactive]').filter({ hasText: 'E2E PDF 1779601980568' })

```

```yaml
- main:
  - button "Volver a la lista de chats"
  - text: Tienda E2E mpjczmam_pq2zlz
  - button "Pagar"
  - link "U":
    - /url: /profile/53946640955
  - text: Comprador · Usuario sin nombre 53946640955 50
  - button "Ampliar imagen 1"
  - text: Hola, tengo interés en la oferta «Producto E2E mpjczmam_pq2zlz». Comparto referencia de la ficha y me gustaría charlar contigo. 01:53 AM
  - link "U":
    - /url: /profile/53946640955
  - text: Comprador · Usuario sin nombre 53946640955 50 Consulta pública E2E QA 1779601986565 01:53 AM
  - link "T":
    - /url: /store/ust_db2cdaf1bcfd_1779601857357/vitrina
  - text: Tienda E2E mpjczmam_pq2zlz +54 11 0000-0000 80 Acuerdo de compra E2E PDF 1779601980568 Solo mercancías
  - paragraph: Confirma la compra según este acuerdo o rechaza la propuesta.
  - button "Comprar"
  - button "Rechazar"
  - text: 01:53 AM
  - button "Adjuntar documentos"
  - button "Adjuntar imágenes"
  - textbox "Escribe un mensaje…"
  - button "Grabar nota de voz"
  - complementary "Contratos, rutas e integrantes del chat":
    - button "Contratos"
    - button "Rutas"
    - button "Integrantes (2)"
    - button "Todos"
    - button "Tienda E2E mpjczmam_pq2zlz"
    - button "Usuario sin nombre"
    - list:
      - listitem:
        - button "E2E PDF 1779601980568 Pendiente Tienda E2E mpjczmam_pq2zlz"
- 'button "Tienda E2E mpjczmam_pq2zlz Acuerdo: E2E Clarification 1779602017231 Abrir chat"'
```

# Test source

```ts
  1  | import { test, expect } from "../../Resources/auth-fixture";
  2  | import {
  3  |   chatE2EReady,
  4  |   chatE2ESellerSkipReason,
  5  |   chatE2ESkipReason,
  6  |   e2eOfferId,
  7  |   getE2EToken,
  8  |   getE2ESellerSession,
  9  |   hasDistinctSellerSession,
  10 | } from "../../Resources/chat-env";
  11 | import {
  12 |   buyerRespondToAgreement,
  13 |   createThreadAsBuyer,
  14 |   openAgreementDetailInRail,
  15 |   openSellerPage,
  16 |   sellerEmitMerchandiseAgreement,
  17 | } from "../../Resources/agreement-ui-helpers";
  18 | import { reloadChatThread } from "../../Resources/chat-helpers";
  19 | 
  20 | /** Paridad E2E con tradeAgreementPdfDownload.test.ts */
  21 | test.describe("tradeAgreementPdfDownload E2E", () => {
  22 |   test.skip(!chatE2EReady(), chatE2ESkipReason);
  23 |   test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  24 | 
  25 |   test("plain document includes agreement title in PDF download", async ({
  26 |     browser,
  27 |   }) => {
  28 |     test.setTimeout(120_000);
  29 |     const seller = getE2ESellerSession()!;
  30 |     const title = `E2E PDF ${Date.now()}`;
  31 |     const { buyerPage, threadId } = await createThreadAsBuyer(
  32 |       browser,
  33 |       getE2EToken(),
  34 |       e2eOfferId,
  35 |     );
  36 |     const sellerPage = await openSellerPage(
  37 |       browser,
  38 |       seller.sessionToken,
  39 |       threadId,
  40 |     );
  41 |     await sellerEmitMerchandiseAgreement(sellerPage, {
  42 |       title,
  43 |       productNamePart: "Producto E2E",
  44 |     });
  45 |     await reloadChatThread(buyerPage);
  46 |     await expect(
  47 |       buyerPage.locator("[data-chat-interactive]").filter({ hasText: title }),
> 48 |     ).toBeVisible({ timeout: 25_000 });
     |       ^ Error: expect(locator).toBeVisible() failed
  49 |     await buyerRespondToAgreement(buyerPage, title, "accept");
  50 |     await openAgreementDetailInRail(buyerPage, title);
  51 |     const downloadBtn = buyerPage.getByRole("button", {
  52 |       name: /descargar pdf/i,
  53 |     });
  54 |     await expect(downloadBtn).toBeVisible();
  55 |     const [download] = await Promise.all([
  56 |       buyerPage.waitForEvent("download", { timeout: 30_000 }),
  57 |       downloadBtn.click(),
  58 |     ]);
  59 |     const path = await download.path();
  60 |     expect(path).toBeTruthy();
  61 |     expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  62 | 
  63 |     await sellerPage.close();
  64 |     await buyerPage.context().close();
  65 |   });
  66 | });
  67 | 
```