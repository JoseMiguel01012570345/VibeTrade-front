# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Notifications\notifications-realtime.spec.ts >> notifications realtime E2E >> receives notifications for agreement accept/reject/edit
- Location: test\e2e\test-feats\Notifications\notifications-realtime.spec.ts:82:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-chat-agreement]').filter({ hasText: 'Agreement Test 1779602321997' }).getByRole('button').filter({ hasText: /aceptar|comprar|confirmar/i })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('[data-chat-agreement]').filter({ hasText: 'Agreement Test 1779602321997' }).getByRole('button').filter({ hasText: /aceptar|comprar|confirmar/i })

```

```yaml
- main:
  - button "Volver a la lista de chats"
  - text: Tienda E2E mpjczmam_pq2zlz · Usuario sin nombre
  - button "Emitir acuerdo"
  - link "U":
    - /url: /profile/53946640955
  - text: Comprador · Usuario sin nombre +54 11 0000-0000 0 Consulta pública E2E QA 1779601986565 01:53 AM
  - link "U":
    - /url: /profile/53946640955
  - text: Comprador · Usuario sin nombre +54 11 0000-0000 0 Consulta pública E2E comment 1779602226152 01:57 AM
  - link "U":
    - /url: /profile/53946640955
  - text: Comprador · Usuario sin nombre +54 11 0000-0000 0 Consulta pública E2E reply 01:57 AM
  - link "U":
    - /url: /profile/53946640955
  - text: Comprador · Usuario sin nombre +54 11 0000-0000 0
  - button "Ampliar imagen 1"
  - text: Hola, tengo interés en la oferta «Producto E2E mpjczmam_pq2zlz». Comparto referencia de la ficha y me gustaría charlar contigo. 01:58 AM
  - link "U":
    - /url: /profile/53946640955
  - text: Comprador · Usuario sin nombre +54 11 0000-0000 0 Acuerdo de compra Agreement Test 1779602321997 Solo mercancías Pendiente de respuesta del comprador 01:58 AM
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
        - button "Agreement Test 1779602321997 Pendiente Tienda E2E mpjczmam_pq2zlz"
```

# Test source

```ts
  26  |     
  27  |     const buyerCtx = await browser.newContext();
  28  |     const sellerCtx = await browser.newContext();
  29  |     
  30  |     try {
  31  |       await buyerCtx.addInitScript((t: string) => {
  32  |         sessionStorage.setItem("vt_session_active", "1");
  33  |         sessionStorage.setItem("vt_session_token", t);
  34  |       }, getE2EToken());
  35  |       const buyerPage = await buyerCtx.newPage();
  36  |       const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
  37  |       
  38  |       await sellerCtx.addInitScript((t: string) => {
  39  |         sessionStorage.setItem("vt_session_active", "1");
  40  |         sessionStorage.setItem("vt_session_token", t);
  41  |       }, getE2ESellerToken());
  42  |       const sellerPage = await sellerCtx.newPage();
  43  |       await openChatThread(sellerPage, threadId);
  44  |       await waitForChatReady(sellerPage);
  45  |       
  46  |       // User A (buyer) stays in chat, User B (seller) goes to home page
  47  |       await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  48  |       await expect(buyerPage.getByRole("button", { name: /abrir notificaciones/i }))
  49  |         .toBeVisible({ timeout: 20_000 });
  50  |       
  51  |       const notificationBell = buyerPage.getByRole("button", { name: /abrir notificaciones/i });
  52  |       
  53  |       // User B sends a message
  54  |       const messageText = `Test notification message ${Date.now()}`;
  55  |       await sendChatMessageViaUI(sellerPage, messageText);
  56  |       
  57  |       // Wait for real-time notification to arrive
  58  |       await buyerPage.waitForTimeout(3000);
  59  |       
  60  |       // Open notifications panel
  61  |       await notificationBell.click();
  62  |       
  63  |       // Verify notification panel is open
  64  |       const notificationsModal = buyerPage.getByRole("dialog", { name: /notificaciones/i });
  65  |       await expect(notificationsModal).toBeVisible({ timeout: 10_000 });
  66  |       
  67  |       // Click on the notification to navigate to chat
  68  |       const chatLink = buyerPage.getByText(/abrir chat/i).first();
  69  |       if (await chatLink.isVisible().catch(() => false)) {
  70  |         await chatLink.click();
  71  |       }
  72  |       
  73  |       // Verify navigated to chat and message is visible
  74  |       await expect(buyerPage).toHaveURL(new RegExp(`/chat/${threadId}`), { timeout: 30_000 });
  75  |       await expect(buyerPage.getByText(messageText).first()).toBeVisible({ timeout: 20_000 });
  76  |     } finally {
  77  |       await buyerCtx.close();
  78  |       await sellerCtx.close();
  79  |     }
  80  |   });
  81  | 
  82  |   test("receives notifications for agreement accept/reject/edit", async ({ browser }) => {
  83  |     test.slow();
  84  |     
  85  |     const buyerCtx = await browser.newContext();
  86  |     const sellerCtx = await browser.newContext();
  87  |     
  88  |     try {
  89  |       await buyerCtx.addInitScript((t: string) => {
  90  |         sessionStorage.setItem("vt_session_active", "1");
  91  |         sessionStorage.setItem("vt_session_token", t);
  92  |       }, getE2EToken());
  93  |       const buyerPage = await buyerCtx.newPage();
  94  |       
  95  |       await sellerCtx.addInitScript((t: string) => {
  96  |         sessionStorage.setItem("vt_session_active", "1");
  97  |         sessionStorage.setItem("vt_session_token", t);
  98  |       }, getE2ESellerToken());
  99  |       const sellerPage = await sellerCtx.newPage();
  100 |       
  101 |       // Create chat thread as buyer
  102 |       const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
  103 |       await openChatThread(sellerPage, threadId);
  104 |       await waitForChatReady(sellerPage);
  105 |       await waitForChatReady(buyerPage);
  106 |       
  107 |       // Seller emits agreement
  108 |       const agreementTitle = `Agreement Test ${Date.now()}`;
  109 |       await sellerEmitMerchandiseAgreement(sellerPage, {
  110 |         title: agreementTitle,
  111 |       });
  112 |       
  113 |       // Wait for agreement to appear in buyer's chat
  114 |       await expect(buyerPage.locator("[data-chat-agreement]").filter({ hasText: agreementTitle }))
  115 |         .toBeVisible({ timeout: 35_000 });
  116 |       
  117 |       // Buyer goes to home page to receive notifications
  118 |       await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  119 |       
  120 |       // Seller accepts the agreement (should be "Aceptar" not "Comprar")
  121 |       const agreementBubble = sellerPage.locator("[data-chat-agreement]").filter({ hasText: agreementTitle });
  122 |       await expect(agreementBubble).toBeVisible({ timeout: 20_000 });
  123 |       
  124 |       // Look for accept button (various possible labels)
  125 |       const acceptButton = agreementBubble.getByRole("button").filter({ hasText: /aceptar|comprar|confirmar/i });
> 126 |       await expect(acceptButton).toBeVisible({ timeout: 10_000 });
      |                                  ^ Error: expect(locator).toBeVisible() failed
  127 |       await acceptButton.click();
  128 |       
  129 |       // Confirm acceptance if dialog appears
  130 |       const confirmButton = sellerPage.getByRole("button", { name: /sí, aceptar|confirmar/i });
  131 |       if (await confirmButton.isVisible().catch(() => false)) {
  132 |         await confirmButton.click();
  133 |       }
  134 |       
  135 |       // Wait for notification to arrive to buyer
  136 |       await buyerPage.waitForTimeout(5000);
  137 |       
  138 |       // Open notifications panel
  139 |       const notificationBell = buyerPage.getByRole("button", { name: /abrir notificaciones/i });
  140 |       await notificationBell.click();
  141 |       
  142 |       // Verify notification about agreement accepted
  143 |       const notificationsModal = buyerPage.getByRole("dialog", { name: /notificaciones/i });
  144 |       await expect(notificationsModal).toBeVisible({ timeout: 10_000 });
  145 |       
  146 |       // Close notifications and go back to chat for edit test
  147 |       await buyerPage.getByRole("button", { name: /cerrar/i }).first().click();
  148 |       await buyerPage.goto(`/chat/${threadId}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  149 |       await waitForChatReady(buyerPage);
  150 |       
  151 |       // Seller edits the agreement
  152 |       await sellerPage.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  153 |       await waitForChatReady(sellerPage);
  154 |       
  155 |       // Find the accepted agreement and edit it
  156 |       const acceptedBubble = sellerPage.locator("[data-chat-agreement]").filter({ hasText: agreementTitle });
  157 |       await expect(acceptedBubble.getByText(/aceptado/i)).toBeVisible({ timeout: 20_000 });
  158 |       
  159 |       // Click edit button if available
  160 |       const editButton = acceptedBubble.getByRole("button", { name: /editar/i });
  161 |       if (await editButton.isVisible().catch(() => false)) {
  162 |         await editButton.click();
  163 |         
  164 |         // Modify and save
  165 |         await sellerPage.getByLabel(/título/i).fill(`${agreementTitle} - Edited`);
  166 |         await sellerPage.getByRole("button", { name: /guardar|actualizar/i }).click();
  167 |       }
  168 |     } finally {
  169 |       await buyerCtx.close();
  170 |       await sellerCtx.close();
  171 |     }
  172 |   });
  173 | 
  174 |   test("syncs notifications from server on page load", async ({ browser }) => {
  175 |     test.slow();
  176 |     
  177 |     const buyerCtx = await browser.newContext();
  178 |     const sellerCtx = await browser.newContext();
  179 |     
  180 |     try {
  181 |       await buyerCtx.addInitScript((t: string) => {
  182 |         sessionStorage.setItem("vt_session_active", "1");
  183 |         sessionStorage.setItem("vt_session_token", t);
  184 |       }, getE2EToken());
  185 |       const buyerPage = await buyerCtx.newPage();
  186 |       
  187 |       await sellerCtx.addInitScript((t: string) => {
  188 |         sessionStorage.setItem("vt_session_active", "1");
  189 |         sessionStorage.setItem("vt_session_token", t);
  190 |       }, getE2ESellerToken());
  191 |       const sellerPage = await sellerCtx.newPage();
  192 |       
  193 |       // Create chat thread
  194 |       const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
  195 |       await openChatThread(sellerPage, threadId);
  196 |       await waitForChatReady(sellerPage);
  197 |       
  198 |       // Seller sends message while buyer is not in chat
  199 |       await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  200 |       
  201 |       const messageText = `Offline notification test ${Date.now()}`;
  202 |       await sendChatMessageViaUI(sellerPage, messageText);
  203 |       
  204 |       // Wait for message to be delivered
  205 |       await sellerPage.waitForTimeout(3000);
  206 |       
  207 |       // Close buyer page completely (simulate offline)
  208 |       await buyerPage.close();
  209 |       
  210 |       // Reopen buyer page
  211 |       const newBuyerPage = await buyerCtx.newPage();
  212 |       await newBuyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  213 |       
  214 |       // Wait for notifications to sync
  215 |       await newBuyerPage.waitForTimeout(5000);
  216 |       
  217 |       // Open notifications panel
  218 |       const notificationBell = newBuyerPage.getByRole("button", { name: /abrir notificaciones/i });
  219 |       await expect(notificationBell).toBeVisible({ timeout: 20_000 });
  220 |       await notificationBell.click();
  221 |       
  222 |       // Verify notifications panel shows synced notifications
  223 |       const notificationsModal = newBuyerPage.getByRole("dialog", { name: /notificaciones/i });
  224 |       await expect(notificationsModal).toBeVisible({ timeout: 10_000 });
  225 |       
  226 |       // Verify the panel loaded with notifications
```