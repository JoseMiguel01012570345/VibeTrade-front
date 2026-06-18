# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Chat\chat-route-logistics-withdraw-leave.spec.ts >> chat route logistics — withdraw & party leave >> L-14: party soft leave blocked when route evidence rejected
- Location: test\e2e\test-feats\Chat\chat-route-logistics-withdraw-leave.spec.ts:70:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-chat-message-row]').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('[data-chat-message-row]').first()

```

# Test source

```ts
  1   | import type { Page } from "@playwright/test";
  2   | import { expect } from "@playwright/test";
  3   | 
  4   | export async function waitForAgreementBubble(
  5   |   page: Page,
  6   |   title: string,
  7   | ): Promise<void> {
  8   |   await expect(
  9   |     page.locator("[data-chat-agreement]").filter({ hasText: title }).last(),
  10  |   ).toBeVisible({ timeout: 35_000 });
  11  | }
  12  | 
  13  | export async function openOfferAndComprar(page: Page, offerId: string) {
  14  |   await page.goto(`/offer/${offerId}`, {
  15  |     waitUntil: "domcontentloaded",
  16  |     timeout: 45_000,
  17  |   });
  18  |   const comprar = page.getByRole("button", {
  19  |     name: /comprar.*chat/i,
  20  |   });
  21  |   await expect(comprar).toBeVisible({ timeout: 30_000 });
  22  |   await comprar.click();
  23  |   const confirm = page.getByRole("button", {
  24  |     name: /sí, abrir chat|confirmar|abrir chat|continuar/i,
  25  |   });
  26  |   await expect(confirm).toBeVisible({ timeout: 15_000 });
  27  |   await confirm.click();
  28  |   await expect(page).toHaveURL(/\/chat\/cth_/, { timeout: 45_000 });
  29  |   return page.url().match(/\/chat\/(cth_[^/?#]+)/)?.[1] ?? "";
  30  | }
  31  | 
  32  | export async function waitForChatThread(page: Page) {
> 33  |   await expect(page.locator("[data-chat-message-row]").first()).toBeVisible({
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  34  |     timeout: 20_000,
  35  |   });
  36  | }
  37  | 
  38  | export async function waitForChatReady(page: Page): Promise<void> {
  39  |   await expect(page.getByText(/cargando chat/i)).toBeHidden({ timeout: 45_000 });
  40  |   await waitForChatThread(page);
  41  | }
  42  | 
  43  | export async function reloadChatThread(page: Page): Promise<void> {
  44  |   try {
  45  |     await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  46  |     await waitForChatReady(page);
  47  |   } catch {
  48  |     const threadId = page.url().match(/\/chat\/(cth_[^/?#]+)/)?.[1];
  49  |     if (threadId) {
  50  |       await openChatThread(page, threadId);
  51  |     } else {
  52  |       throw new Error("reloadChatThread failed and thread id is unknown");
  53  |     }
  54  |   }
  55  | }
  56  | 
  57  | export async function openRailContracts(page: Page) {
  58  |   const contractsTab = page.getByRole("button", { name: /^contratos$/i });
  59  |   if (await contractsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
  60  |     await contractsTab.click();
  61  |   }
  62  | }
  63  | 
  64  | export async function openChatThread(page: Page, threadId: string): Promise<void> {
  65  |   await page.goto(`/chat/${threadId}`, {
  66  |     waitUntil: "domcontentloaded",
  67  |     timeout: 45_000,
  68  |   });
  69  |   await waitForChatReady(page);
  70  | }
  71  | 
  72  | export async function openChatPeoplePanel(page: Page): Promise<void> {
  73  |   const peopleTab = page.getByRole("button", { name: /integrantes/i });
  74  |   await expect(peopleTab).toBeVisible({ timeout: 15_000 });
  75  |   await peopleTab.click();
  76  | }
  77  | 
  78  | export async function readIntegrantesCount(page: Page): Promise<number> {
  79  |   const memberBtn = page.getByRole("button", { name: /integrantes/i });
  80  |   await expect(memberBtn).toBeVisible({ timeout: 15_000 });
  81  |   const text = (await memberBtn.textContent().catch(() => "")) ?? "";
  82  |   return parseInt(text.match(/\d+/)?.[0] ?? "0", 10);
  83  | }
  84  | 
  85  | export async function readChatHeaderTitle(page: Page): Promise<string> {
  86  |   const header = page.locator(".vt-card").filter({
  87  |     has: page.getByRole("button", { name: /volver a la lista de chats/i }),
  88  |   });
  89  |   await expect(header).toBeVisible({ timeout: 15_000 });
  90  |   const title = await header.locator(".font-black").first().textContent();
  91  |   return (title ?? "").trim();
  92  | }
  93  | 
  94  | /** «Salir» en la lista de chats (sin acuerdo aceptado → notify-participant-left). */
  95  | export async function leaveChatFromListUI(
  96  |   page: Page,
  97  |   threadId: string,
  98  | ): Promise<void> {
  99  |   await page.goto("/chat", {
  100 |     waitUntil: "domcontentloaded",
  101 |     timeout: 45_000,
  102 |   });
  103 |   const threadLink = page.locator(`a[href="/chat/${threadId}"]`);
  104 |   await expect(threadLink).toBeVisible({ timeout: 20_000 });
  105 |   await threadLink
  106 |     .locator("xpath=..")
  107 |     .getByRole("button", { name: /^salir$/i })
  108 |     .click();
  109 |   const dialog = page.getByRole("dialog", { name: /salir del chat/i });
  110 |   await expect(dialog).toBeVisible({ timeout: 10_000 });
  111 |   await dialog.getByRole("button", { name: /sí, salir/i }).click();
  112 |   await expect(dialog).toBeHidden({ timeout: 15_000 });
  113 | }
  114 | 
  115 | export async function expectParticipantRoleVisible(
  116 |   page: Page,
  117 |   roleLabel: "Comprador" | "Vendedor",
  118 |   visible: boolean,
  119 | ): Promise<void> {
  120 |   const rail = page.getByRole("complementary", {
  121 |     name: /contratos, rutas e integrantes/i,
  122 |   });
  123 |   const role = rail.getByText(roleLabel, { exact: true });
  124 |   if (visible) {
  125 |     await expect(role).toBeVisible({ timeout: 15_000 });
  126 |   } else {
  127 |     await expect(role).toBeHidden({ timeout: 15_000 });
  128 |   }
  129 | }
  130 | 
  131 | export function chatParticipantProfileLinks(page: Page) {
  132 |   return page.locator(
  133 |     "a[href^='/profile/'], a[href*='/store/'][href*='vitrina']",
```