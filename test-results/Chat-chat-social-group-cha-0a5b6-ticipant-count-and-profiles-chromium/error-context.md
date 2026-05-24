# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Chat\chat-social-group.spec.ts >> chat social group E2E >> social group chat shows correct participant count and profiles
- Location: test\e2e\test-feats\Chat\chat-social-group.spec.ts:276:3

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 2
Received:    0
```

# Test source

```ts
  233 | 
  234 |         // Verify offline messages are visible (may take time to sync)
  235 |         for (const msg of offlineMessages) {
  236 |           const msgLocator = user2ReconnectedPage.getByText(msg).first();
  237 |           try {
  238 |             await expect(msgLocator).toBeVisible({ timeout: 30_000 });
  239 |           } catch {
  240 |             // Message may not appear if sync failed - reload and retry
  241 |             await user2ReconnectedPage.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  242 |             await waitForChatReady(user2ReconnectedPage);
  243 |             await expect(msgLocator).toBeVisible({ timeout: 20_000 });
  244 |           }
  245 |         }
  246 | 
  247 |         // Scroll to view all messages (triggers "read" status)
  248 |         const messageRows = user2ReconnectedPage.locator("[data-chat-message-row]");
  249 |         const count = await messageRows.count();
  250 |         for (let i = 0; i < Math.min(count, 5); i++) {
  251 |           await messageRows.nth(i).scrollIntoViewIfNeeded();
  252 |           await user2ReconnectedPage.waitForTimeout(500);
  253 |         }
  254 | 
  255 |         // Wait for status updates to propagate
  256 |         await user2ReconnectedPage.waitForTimeout(3000);
  257 | 
  258 |         // User 1 should see updated status (messages marked as seen)
  259 |         await user1Page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  260 |         await waitForChatReady(user1Page);
  261 | 
  262 |         // Verify all messages still visible
  263 |         for (const msg of [...messages, ...offlineMessages]) {
  264 |           await expect(user1Page.getByText(msg).first()).toBeVisible({
  265 |             timeout: 20_000,
  266 |           });
  267 |         }
  268 |       } finally {
  269 |         await user2ReconnectedCtx.close();
  270 |       }
  271 |     } finally {
  272 |       await user1Ctx.close();
  273 |     }
  274 |   });
  275 | 
  276 |   test("social group chat shows correct participant count and profiles", async ({ browser }) => {
  277 |     test.slow();
  278 | 
  279 |     const buyerCtx = await browser.newContext();
  280 |     const sellerCtx = await browser.newContext();
  281 | 
  282 |     try {
  283 |       await buyerCtx.addInitScript((t: string) => {
  284 |         sessionStorage.setItem("vt_session_active", "1");
  285 |         sessionStorage.setItem("vt_session_token", t);
  286 |       }, getE2EToken());
  287 |       const buyerPage = await buyerCtx.newPage();
  288 | 
  289 |       await sellerCtx.addInitScript((t: string) => {
  290 |         sessionStorage.setItem("vt_session_active", "1");
  291 |         sessionStorage.setItem("vt_session_token", t);
  292 |       }, getE2ESellerToken());
  293 |       const sellerPage = await sellerCtx.newPage();
  294 | 
  295 |       // Create chat thread
  296 |       const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
  297 |       await openChatThread(sellerPage, threadId);
  298 |       await waitForChatReady(sellerPage);
  299 |       await waitForChatReady(buyerPage);
  300 | 
  301 |       // Open the participants/people panel (right rail panel)
  302 |       const panelToggle = buyerPage.getByRole("button", {
  303 |         name: /acciones del chat|panel|participantes/i,
  304 |       }).first();
  305 |       if (await panelToggle.isVisible().catch(() => false)) {
  306 |         await panelToggle.click();
  307 |         await buyerPage.waitForTimeout(1000);
  308 |       }
  309 | 
  310 |       // Look for the participants panel
  311 |       const participantsPanel = buyerPage
  312 |         .locator("[data-chat-participants], [data-right-rail], .chat-participants")
  313 |         .first();
  314 | 
  315 |       // If panel not immediately visible, try clicking on "Panel" button
  316 |       if (!(await participantsPanel.isVisible().catch(() => false))) {
  317 |         const panelButton = buyerPage
  318 |           .getByRole("button")
  319 |           .filter({ hasText: /panel/i })
  320 |           .first();
  321 |         if (await panelButton.isVisible().catch(() => false)) {
  322 |           await panelButton.click();
  323 |           await buyerPage.waitForTimeout(1000);
  324 |         }
  325 |       }
  326 | 
  327 |       // Verify participant count (should be at least 2 - buyer and seller)
  328 |       const participantLinks = buyerPage
  329 |         .locator('a[href^="/profile"], a[href^="/user"]')
  330 |         .filter({ has: buyerPage.locator("text=/confianza|trust/i") });
  331 | 
  332 |       const participantCount = await participantLinks.count();
> 333 |       expect(participantCount).toBeGreaterThanOrEqual(2);
      |                                ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  334 | 
  335 |       // Send a message and verify it appears for both
  336 |       const testMessage = `Group chat test ${Date.now()}`;
  337 |       await sendChatMessageViaUI(buyerPage, testMessage);
  338 | 
  339 |       await expect(buyerPage.getByText(testMessage).first()).toBeVisible({
  340 |         timeout: 20_000,
  341 |       });
  342 |       await expect(sellerPage.getByText(testMessage).first()).toBeVisible({
  343 |         timeout: 20_000,
  344 |       });
  345 |     } finally {
  346 |       await buyerCtx.close();
  347 |       await sellerCtx.close();
  348 |     }
  349 |   });
  350 | 
  351 |   test("can access user profiles from chat participants panel", async ({ browser }) => {
  352 |     test.slow();
  353 | 
  354 |     const buyerCtx = await browser.newContext();
  355 |     const sellerCtx = await browser.newContext();
  356 | 
  357 |     try {
  358 |       await buyerCtx.addInitScript((t: string) => {
  359 |         sessionStorage.setItem("vt_session_active", "1");
  360 |         sessionStorage.setItem("vt_session_token", t);
  361 |       }, getE2EToken());
  362 |       const buyerPage = await buyerCtx.newPage();
  363 | 
  364 |       await sellerCtx.addInitScript((t: string) => {
  365 |         sessionStorage.setItem("vt_session_active", "1");
  366 |         sessionStorage.setItem("vt_session_token", t);
  367 |       }, getE2ESellerToken());
  368 |       const sellerPage = await sellerCtx.newPage();
  369 | 
  370 |       // Create chat thread
  371 |       const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
  372 |       await openChatThread(sellerPage, threadId);
  373 |       await waitForChatReady(sellerPage);
  374 |       await waitForChatReady(buyerPage);
  375 | 
  376 |       // Try to open participants panel
  377 |       const panelButton = buyerPage
  378 |         .getByRole("button")
  379 |         .filter({ hasText: /panel|participantes/i })
  380 |         .first();
  381 |       if (await panelButton.isVisible().catch(() => false)) {
  382 |         await panelButton.click();
  383 |         await buyerPage.waitForTimeout(1000);
  384 |       }
  385 | 
  386 |       // Look for participant cards with profile links
  387 |       const participantCards = buyerPage
  388 |         .locator("a")
  389 |         .filter({ has: buyerPage.locator("text=/confianza/i") })
  390 |         .filter({ has: buyerPage.locator("text=/comprador|vendedor|transportista/i") });
  391 | 
  392 |       // Count participants
  393 |       const count = await participantCards.count();
  394 |       expect(count).toBeGreaterThanOrEqual(1);
  395 | 
  396 |       // Click on first participant to access their profile
  397 |       const firstParticipant = participantCards.first();
  398 |       await expect(firstParticipant).toBeVisible({ timeout: 10_000 });
  399 | 
  400 |       // Get the href before clicking
  401 |       const href = await firstParticipant.getAttribute("href");
  402 |       expect(href).toBeTruthy();
  403 | 
  404 |       // Click the participant card
  405 |       await firstParticipant.click();
  406 | 
  407 |       // Verify we navigated to a profile page
  408 |       await expect(buyerPage).toHaveURL(new RegExp(`/profile|/user|/store`), {
  409 |         timeout: 30_000,
  410 |       });
  411 | 
  412 |       // Verify profile page loaded with expected content
  413 |       await expect(
  414 |         buyerPage.getByText(/confianza|verificado|productos/i).first(),
  415 |       ).toBeVisible({ timeout: 20_000 });
  416 |     } finally {
  417 |       await buyerCtx.close();
  418 |       await sellerCtx.close();
  419 |     }
  420 |   });
  421 | });
  422 | 
```