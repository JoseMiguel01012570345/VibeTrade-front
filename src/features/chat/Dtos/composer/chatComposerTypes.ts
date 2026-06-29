export type PendingImg = { id: string; url: string };

export type PendingDoc = {
  id: string;
  url: string;
  name: string;
  size: string;
  kind: "pdf" | "doc" | "other";
};
