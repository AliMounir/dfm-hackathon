import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentProps<"div"> & {
  value: number;
};

export function Progress({ value, className, ...props }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-none bg-line", className)}
      {...props}
    >
      <div
        className="h-full rounded-none bg-azure transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
