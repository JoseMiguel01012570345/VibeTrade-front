import { describe, expect, it } from "vitest";
import {
  cartHasProducts,
  cartLineKey,
  cartSubtotal,
  type CartItem,
} from "@features/orders/logic/cartStore";

const productLine: CartItem = {
  kind: "product",
  productId: "prd_1",
  storeId: "st_1",
  name: "Producto",
  unitPrice: 10,
  currencyCode: "USD",
  quantity: 2,
};

const serviceLine: CartItem = {
  kind: "service",
  serviceId: "svc_1",
  storeId: "st_1",
  name: "Servicio",
  unitPrice: 25,
  currencyCode: "USD",
  quantity: 1,
};

describe("mixed cart checkout helpers", () => {
  it("cartLineKey distingue producto y servicio", () => {
    expect(cartLineKey(productLine)).toBe("prd:prd_1");
    expect(cartLineKey(serviceLine)).toBe("svc:svc_1");
  });

  it("cartSubtotal suma líneas mixtas", () => {
    expect(cartSubtotal([productLine, serviceLine])).toBe(45);
  });

  it("cartHasProducts es false solo con servicios", () => {
    expect(cartHasProducts([serviceLine])).toBe(false);
  });

  it("cartHasProducts es true con al menos un producto", () => {
    expect(cartHasProducts([serviceLine, productLine])).toBe(true);
  });
});
