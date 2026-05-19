import { describe, expect, it } from "vitest";
import { buildTradeAgreementPlainDocument } from "@features/chat/utils/tradeAgreementPdfText";
import { makeTradeAgreement } from "@test/Resources/Chat/thread-factories";

describe("trade agreement PDF content", () => {
  it("plain document includes agreement title", () => {
    const ag = makeTradeAgreement({ title: "Contrato mercancía demo" });
    const plain = buildTradeAgreementPlainDocument(ag, null);
    expect(plain).toContain("ACUERDO COMERCIAL");
    expect(plain).toContain("Contrato mercancía demo");
  });
});
