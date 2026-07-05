import { useMemo, useState } from "react";
import { FileDown, MapPin } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { toast } from "sonner";
import { cn } from "@shared/lib/cn";
import type { Message, ReplyQuote } from "@features/market/logic/store/useMarketStore";
import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import { ChatLinkEmbed } from "../embeds/ChatLinkEmbed";
import { ChatStructuredEmbed } from "../embeds/ChatStructuredEmbed";
import { AgreementBubble } from "./AgreementBubble";
import { AudioMicro } from "./AudioMicro";
import { ChatReplyQuotes } from "./ChatReplyQuotes";
import { DocGrid, DocRow } from "./DocRow";
import { hhmm } from "./MsgMeta";
import { ImageGrid } from "./ImageGrid";
import { ytThread } from "@features/chat/styles/chatMediaThreadStyles";
import type { PaymentFeeReceiptPayload } from "@features/payments/Dtos/paymentFeeReceiptTypes";
import { downloadPaymentFeeReceiptPdf } from "@features/chat/logic/payments/paymentCheckoutPdfDownload";
import {
  minorToMajor,
  paymentFeeLabels,
  currencyMinorDecimals,
} from "@features/payments/logic/paymentFeePolicy";

function firstHttpUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>'")\]]+/i);
  if (!m) return null;
  return m[0].replace(/[),.;]+$/g, "");
}

function TextMessageBody({
  text,
  hasThread,
  replyQuotes,
  onReplyQuoteNavigate,
}: {
  text: string;
  hasThread: boolean;
  replyQuotes?: ReplyQuote[];
  onReplyQuoteNavigate?: (quotedMessageId: string) => void;
}) {
  const previewUrl = useMemo(() => firstHttpUrl(text), [text]);
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", hasThread && ytThread)}>
      {hasThread && replyQuotes && replyQuotes.length > 0 ? (
        <ChatReplyQuotes
          quotes={replyQuotes}
          inThread
          onQuoteActivate={onReplyQuoteNavigate}
        />
      ) : null}
      <div className={cn(hasThread && "pt-0.5")}>
        <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {text}
        </div>
        {previewUrl ? <ChatLinkEmbed url={previewUrl} /> : null}
      </div>
    </div>
  );
}

function fmtReceiptMinor(amountMinor: number, curLower: string): string {
  const maj = minorToMajor(amountMinor, curLower);
  const frac = currencyMinorDecimals(curLower);
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: curLower.slice(0, 3).toUpperCase(),
      minimumFractionDigits: frac,
      maximumFractionDigits: frac,
    }).format(maj);
  } catch {
    return `${maj.toFixed(frac)} ${curLower.toUpperCase()}`;
  }
}

function PaymentFeeReceiptBubble({ receipt }: { receipt: PaymentFeeReceiptPayload }) {
  const [busy, setBusy] = useState(false);
  const cur = receipt.currencyLower;
  const issuerLine = (
    <>
      Emisor:{" "}
      <span className="text-[var(--text)]">{receipt.invoiceIssuerPlatform || "VibeTrade"}</span>
      {receipt.invoiceStoreName?.trim() ? (
        <>
          {" "}
          · Tienda:{" "}
          <span className="text-[var(--text)]">{receipt.invoiceStoreName.trim()}</span>
        </>
      ) : null}
    </>
  );
  const agreementLine = (
    <>
      Acuerdo:{" "}
      <span className="text-[var(--text)]">{receipt.agreementTitle || "(sin título)"}</span>
      {" · "}
      {cur.toUpperCase()}
    </>
  );
  return (
    <ChatStructuredEmbed
      title="Recibo de pago"
      subtitle={
        <>
          <span className="block">{issuerLine}</span>
          <span className="mt-1 block">{agreementLine}</span>
        </>
      }
      rows={[
        {
          label: "Subtotal",
          value: fmtReceiptMinor(receipt.subtotalMinor, cur),
        },
        {
          label: `Climate ref. (${paymentFeeLabels.climateRateDisplay}, no cobrado)`,
          value: fmtReceiptMinor(receipt.climateMinor, cur),
        },
        {
          label: "tarifa de procesador liquidación (referencia)",
          value: fmtReceiptMinor(receipt.processorFeeMinorActual, cur),
        },
        {
          label: "Total cobrado (subtotal)",
          value: fmtReceiptMinor(receipt.totalChargedMinor, cur),
          emphasize: true,
        },
      ]}
      footer={
        <>
          <p className="text-[11px] leading-snug text-[var(--muted)]">
            tarifa de procesador estimada antes del pago (referencia):{" "}
            {fmtReceiptMinor(receipt.processorFeeMinorEstimated, cur)}. Políticas de tarifas:{" "}
            <a
              href={receipt.paymentFeePolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[var(--primary)] underline"
            >
              consultá aquí
            </a>
            .
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await downloadPaymentFeeReceiptPdf(receipt);
                } catch (e) {
                  toast.error((e as Error)?.message ?? "No se pudo generar el PDF.");
                } finally {
                  setBusy(false);
                }
              })();
            }}
            className="mt-2 inline-flex min-h-10 w-full max-w-xs items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] px-3 py-2 text-[12px] font-black text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--primary)_16%,var(--surface))] disabled:opacity-60"
          >
            {busy ? (
              <CeSpinner size="sm" aria-hidden />
            ) : (
              <FileDown className="size-4 shrink-0" aria-hidden />
            )}
            Descargar PDF del desglose
          </button>
        </>
      }
    />
  );
}

export function MessageBody({
  m,
  onImageOpen,
  onReplyQuoteNavigate,
  agreementDoc,
  onAcceptAgreement,
  onRejectAgreement,
  canRespondAgreement,
  agreementViewerIsBuyer,
  onOpenAgreementRouteSheet,
  isMine,
}: {
  m: Message;
  onImageOpen: (url: string) => void;
  /** Al pulsar la cita de una réplica, desplazar el hilo al mensaje original. */
  onReplyQuoteNavigate?: (quotedMessageId: string) => void;
  agreementDoc?: TradeAgreement | null;
  onAcceptAgreement?: () => void;
  onRejectAgreement?: () => void;
  canRespondAgreement?: boolean;
  agreementViewerIsBuyer?: boolean;
  onOpenAgreementRouteSheet?: () => void;
  isMine?: boolean;
}) {
  if (m.type === "text") {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0;
    return (
      <TextMessageBody
        text={m.text}
        hasThread={!!hasThread}
        replyQuotes={m.replyQuotes}
        onReplyQuoteNavigate={onReplyQuoteNavigate}
      />
    );
  }
  if (m.type === "image") {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0;
    return (
      <div className={cn("flex min-w-0 flex-col gap-2", hasThread && ytThread)}>
        {hasThread && (
          <ChatReplyQuotes
            quotes={m.replyQuotes!}
            inThread
            onQuoteActivate={onReplyQuoteNavigate}
          />
        )}
        <ImageGrid images={m.images} onOpen={onImageOpen} />
        {m.embeddedAudio ? (
          <AudioMicro
            url={m.embeddedAudio.url}
            seconds={m.embeddedAudio.seconds}
            isMine={isMine}
          />
        ) : null}
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">
            {m.caption}
          </div>
        ) : null}
      </div>
    );
  }
  if (m.type === "audio") {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0;
    return (
      <div
        className={cn(
          "flex min-w-0 w-full flex-col gap-2 overflow-hidden",
          hasThread && ytThread,
        )}
      >
        {hasThread && (
          <ChatReplyQuotes
            quotes={m.replyQuotes!}
            inThread
            onQuoteActivate={onReplyQuoteNavigate}
          />
        )}
        <div className={cn("min-w-0 w-full", hasThread && "pt-0.5")}>
          <AudioMicro url={m.url} seconds={m.seconds} isMine={isMine} />
        </div>
      </div>
    );
  }
  if (m.type === "docs") {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0;
    return (
      <div className={cn("flex min-w-0 flex-col gap-2", hasThread && ytThread)}>
        {hasThread && (
          <ChatReplyQuotes
            quotes={m.replyQuotes!}
            inThread
            onQuoteActivate={onReplyQuoteNavigate}
          />
        )}
        <DocGrid documents={m.documents} isMine={isMine} />
        {m.embeddedAudio ? (
          <AudioMicro
            url={m.embeddedAudio.url}
            seconds={m.embeddedAudio.seconds}
            isMine={isMine}
          />
        ) : null}
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">
            {m.caption}
          </div>
        ) : null}
      </div>
    );
  }
  if (m.type === "doc") {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0;
    return (
      <div className={cn("flex min-w-0 flex-col gap-2", hasThread && ytThread)}>
        {hasThread && (
          <ChatReplyQuotes
            quotes={m.replyQuotes!}
            inThread
            onQuoteActivate={onReplyQuoteNavigate}
          />
        )}
        <DocRow
          name={m.name}
          size={m.size}
          kind={m.kind}
          url={m.url}
          isMine={isMine}
        />
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">
            {m.caption}
          </div>
        ) : null}
      </div>
    );
  }
  if (m.type === "payment_fee_receipt") {
    if (!m.receipt) {
      return (
        <div className="text-[13px] leading-snug text-[var(--muted)]">
          Recibo de pago: no se pudieron cargar los datos del desglose. Probá actualizar el chat
          o la página.
        </div>
      );
    }
    return <PaymentFeeReceiptBubble receipt={m.receipt} />;
  }
  if (m.type === "certificate")
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_65%,var(--surface))] p-3">
        <div className="font-black">{m.title}</div>
        <div className="mt-2 text-sm text-[var(--muted)]">{m.body}</div>
        <div className="mt-2.5 inline-flex items-center gap-2 text-xs text-[var(--muted)]">
          <MapPin size={14} /> {hhmm(m.at)}
        </div>
      </div>
    );
  if (m.type === "agreement")
    return (
      <AgreementBubble
        title={agreementDoc?.title?.trim() ? agreementDoc.title : m.title}
        agreement={agreementDoc ?? undefined}
        onAccept={onAcceptAgreement}
        onReject={onRejectAgreement}
        canRespond={canRespondAgreement}
        viewerIsBuyer={agreementViewerIsBuyer}
        onOpenRouteSheet={onOpenAgreementRouteSheet}
      />
    );
  return null;
}
