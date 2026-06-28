import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-none px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-positive-wash text-positive",
        warning: "bg-caution-wash text-caution",
        danger: "bg-critical-wash text-critical",
        neutral: "bg-mist text-slate",
        info: "bg-azure-wash text-azure-deep",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
