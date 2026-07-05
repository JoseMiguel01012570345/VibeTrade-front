import type { HTMLAttributes } from "react";
import "./ceImageLoading.css";
import { cn } from "@shared/lib/cn";

export function ImageLoadingShimmer({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ce-image-shimmer", className)}
      aria-hidden={rest["aria-label"] ? undefined : true}
      {...rest}
    />
  );
}
