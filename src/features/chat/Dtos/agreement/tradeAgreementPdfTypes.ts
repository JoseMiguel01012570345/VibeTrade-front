export type CollectAgreementQrLinksOpts = {
  /** Si hay hoja enlazada, añade un QR que abre el chat con esa hoja (solo útil cuando el PDF lleva URL absoluta). */
  threadId?: string;
};

export type AgreementInformePreviewItem = {
  label: string;
  url: string;
  kind: "image" | "document";
};
