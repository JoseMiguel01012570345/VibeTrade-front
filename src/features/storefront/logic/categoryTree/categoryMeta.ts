import type { ReactNode } from "react";

export type CategoryMeta = {
  id: string;
  label: string;
  slug: string;
  description: string;
  icon: ReactNode;
};
