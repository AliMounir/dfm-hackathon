import * as React from "react";

import { cn } from "@/lib/utils";

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
};

export function Tabs({ children }: TabsProps) {
  return <div>{children}</div>;
}

export function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-stone-200 bg-stone-100 p-1",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ComponentProps<"button"> & {
  active?: boolean;
};

export function TabsTrigger({ className, active, ...props }: TabsTriggerProps) {
  return (
    <button
      className={cn(
        "rounded-md px-3 py-2 text-sm font-semibold text-stone-600 transition-colors hover:text-stone-950",
        active && "bg-white text-stone-950 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
