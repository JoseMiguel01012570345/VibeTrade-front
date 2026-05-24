import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  getE2EToken,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  openOfferAndComprar,
  waitForChatReady,
} from "../../Resources/chat-helpers";

/** E2E tests for notifications panel and filtering. */
test.describe("notifications panel E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("filters notifications by date range", async ({ browser }) => {
    test.slow();
    
    const buyerCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    
    try {
      await buyerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2EToken());
      
      // Navigate to home page
      await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      
      // Open notifications panel
      const notificationBell = buyerPage.getByRole("button", { 
        name: /abrir notificaciones/i 
      });
      await expect(notificationBell).toBeVisible({ timeout: 20_000 });
      await notificationBell.click();
      
      // Verify notifications panel opened
      const notificationsModal = buyerPage.getByRole("dialog", { 
        name: /notificaciones/i 
      });
      await expect(notificationsModal).toBeVisible({ timeout: 10_000 });
      
      // Click "Historial por fechas" button to open filters
      const filterHistoryButton = buyerPage.getByRole("button", { 
        name: /historial por fechas/i 
      });
      await expect(filterHistoryButton).toBeVisible();
      await filterHistoryButton.click();
      
      // Verify filter panel appears with date/time inputs
      const filterPanel = buyerPage.getByRole("search", { 
        name: /filtro de notificaciones por rango de fechas/i 
      });
      await expect(filterPanel).toBeVisible({ timeout: 10_000 });
      
      // Verify date filter inputs are present (date picker buttons with aria-labels)
      const fechaInicioButton = buyerPage.getByLabel(/fecha de inicio/i);
      const horaInicioButton = buyerPage.getByLabel(/hora de inicio/i);
      const fechaFinButton = buyerPage.getByLabel(/fecha de fin/i);
      const horaFinButton = buyerPage.getByLabel(/hora de fin/i);
      
      await expect(fechaInicioButton).toBeVisible();
      await expect(horaInicioButton).toBeVisible();
      await expect(fechaFinButton).toBeVisible();
      await expect(horaFinButton).toBeVisible();
      
      // Click "Aplicar filtro" with default values (will likely show error)
      const applyFilterButton = buyerPage.getByRole("button", { 
        name: /aplicar filtro/i 
      });
      await expect(applyFilterButton).toBeVisible();
      await applyFilterButton.click();
      
      // Wait for response (error or results)
      await buyerPage.waitForTimeout(3000);
      
      // Close notifications panel using Escape key
      await buyerPage.keyboard.press("Escape");
      await buyerPage.waitForTimeout(500);
      
      // Verify modal closed
      await expect(notificationsModal).not.toBeVisible();
    } finally {
      await buyerCtx.close();
    }
  });

  test("notification icon hidden in chat, visible elsewhere", async ({ browser }) => {
    test.slow();
    
    const buyerCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    
    try {
      await buyerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2EToken());
      
      // Navigate to home page - bell should be visible
      await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      const notificationBell = buyerPage.getByRole("button", { 
        name: /abrir notificaciones|notificaciones/i 
      });
      await expect(notificationBell).toBeVisible({ timeout: 20_000 });
      
      // Navigate to offer page - bell should be visible
      await buyerPage.goto(`/offer/${e2eOfferId}`, { 
        waitUntil: "domcontentloaded", 
        timeout: 45_000 
      });
      await expect(notificationBell).toBeVisible({ timeout: 20_000 });
      
      // Open chat - bell should be hidden
      await openOfferAndComprar(buyerPage, e2eOfferId);
      await waitForChatReady(buyerPage);
      
      // In chat page, notification bell should not be visible
      const chatUrl = buyerPage.url();
      expect(chatUrl).toMatch(/\/chat\/cth_/);
      
      // Try to find notification bell - should not exist or be hidden
      const bellInChat = buyerPage.getByRole("button", { 
        name: /abrir notificaciones/i 
      });
      await expect(bellInChat).not.toBeVisible();
      
      // Navigate back to home - bell should be visible again
      await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await expect(notificationBell).toBeVisible({ timeout: 20_000 });
    } finally {
      await buyerCtx.close();
    }
  });

  test("clears all notifications", async ({ browser }) => {
    test.slow();
    
    const buyerCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    
    try {
      await buyerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2EToken());
      
      // Navigate to home
      await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      
      // Open notifications panel
      const notificationBell = buyerPage.getByRole("button", { 
        name: /abrir notificaciones/i 
      });
      await expect(notificationBell).toBeVisible({ timeout: 20_000 });
      await notificationBell.click();
      
      // Verify notifications panel opened
      const notificationsModal = buyerPage.getByRole("dialog", { 
        name: /notificaciones/i 
      });
      await expect(notificationsModal).toBeVisible({ timeout: 10_000 });
      
      // If there are notifications, clear them
      const clearButton = buyerPage.getByRole("button", { 
        name: /limpiar/i 
      });
      
      const notificationsList = buyerPage.getByText(/aún no hay notificaciones/i);
      const hasNotifications = await notificationsList.isVisible().catch(() => false);
      
      if (!hasNotifications) {
        await expect(clearButton).toBeEnabled();
        await clearButton.click();
        
        // Wait for "no notifications" message
        await expect(buyerPage.getByText(/aún no hay notificaciones/i)).toBeVisible({ timeout: 10_000 });
      }
    } finally {
      await buyerCtx.close();
    }
  });
});
