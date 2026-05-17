import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { describe, expect, it, vi } from "vitest";
import { PaymentGatewayConfigModal } from "../PaymentGatewayConfigModal";
import {
  mockCreateStripeSetupIntent,
  mockGetStripeConfig,
  mockListStripeCards,
} from "../../../testResources/apiMocks";
import {
  makeStripeCard,
  makeStripeConfig,
} from "../../../testResources/profileFactories";

describe("PaymentGatewayConfigModal", () => {
  it("shows loading then card list", async () => {
    mockGetStripeConfig.mockResolvedValue(makeStripeConfig({ enabled: true }));
    mockListStripeCards.mockResolvedValue([makeStripeCard({ last4: "4242" })]);

    render(<PaymentGatewayConfigModal open onClose={vi.fn()} />);

    expect(screen.getByText(/cargando configuración/i)).toBeInTheDocument();
    expect(await screen.findByText(/•••• 4242/)).toBeInTheDocument();
  });

  it("shows empty cards when stripe disabled", async () => {
    mockGetStripeConfig.mockResolvedValue(
      makeStripeConfig({ enabled: false, publishableKey: undefined }),
    );

    render(<PaymentGatewayConfigModal open onClose={vi.fn()} />);

    expect(
      await screen.findByText(/todavía no hay tarjetas guardadas/i),
    ).toBeInTheDocument();
  });

  it("creates setup intent when adding a card", async () => {
    mockGetStripeConfig.mockResolvedValue(makeStripeConfig());
    mockListStripeCards.mockResolvedValue([]);
    mockCreateStripeSetupIntent.mockResolvedValue({
      clientSecret: "seti_test",
    });

    const user = userEvent.setup();
    render(<PaymentGatewayConfigModal open onClose={vi.fn()} />);

    await screen.findByText(/todavía no hay tarjetas/i);
    await user.click(
      screen.getByRole("button", { name: /crear nueva tarjeta/i }),
    );

    await waitFor(() => {
      expect(mockCreateStripeSetupIntent).toHaveBeenCalled();
      expect(screen.getByTestId("stripe-payment-element")).toBeInTheDocument();
    });
  });

  it("calls onClose on Escape", async () => {
    mockGetStripeConfig.mockResolvedValue(makeStripeConfig());
    mockListStripeCards.mockResolvedValue([]);
    const onClose = vi.fn();
    render(<PaymentGatewayConfigModal open onClose={onClose} />);

    await screen.findByRole("dialog", { name: /pagos \(demo\)/i });
    globalThis.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows toast when create setup intent fails", async () => {
    mockGetStripeConfig.mockResolvedValue(makeStripeConfig());
    mockListStripeCards.mockResolvedValue([]);
    mockCreateStripeSetupIntent.mockRejectedValue(new Error("stripe caído"));

    const user = userEvent.setup();
    render(<PaymentGatewayConfigModal open onClose={vi.fn()} />);

    await screen.findByText(/todavía no hay tarjetas/i);
    await user.click(
      screen.getByRole("button", { name: /crear nueva tarjeta/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("stripe caído");
    });
  });

  it("stays open when config load fails", async () => {
    mockGetStripeConfig.mockRejectedValue(new Error("config fail"));
    render(<PaymentGatewayConfigModal open onClose={vi.fn()} />);

    expect(
      await screen.findByRole("dialog", { name: /pagos \(demo\)/i }),
    ).toBeInTheDocument();
  });
});
