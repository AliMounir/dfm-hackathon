import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Signature treatment: every photograph is recolored into the DFM brand —
 * shadows become deep ink-blue (#06283d), highlights pale azure (#cfebfa).
 * Mount <DuotoneDefs /> once in the root layout; it defines the SVG filter
 * that <Duotone /> references.
 */
export function DuotoneDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        <filter id="azure-duotone" colorInterpolationFilters="sRGB">
          {/* 1. flatten to luminance */}
          <feColorMatrix
            type="matrix"
            values="0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0 0 0 1 0"
          />
          {/* 2. map black→shadow, white→highlight per channel */}
          <feComponentTransfer colorInterpolationFilters="sRGB">
            <feFuncR type="table" tableValues="0.024 0.812" />
            <feFuncG type="table" tableValues="0.157 0.922" />
            <feFuncB type="table" tableValues="0.239 0.980" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

type DuotoneProps = React.ComponentProps<"div"> & {
  src: string;
  alt: string;
  /** Extra classes for the inner <img>. */
  imgClassName?: string;
  /** Dim the image so overlaid text stays legible (hero use). */
  overlay?: boolean;
  priority?: boolean;
};

export function Duotone({
  src,
  alt,
  className,
  imgClassName,
  overlay = false,
  priority = false,
  ...props
}: DuotoneProps) {
  return (
    <div
      className={cn("relative overflow-hidden bg-duo-shadow", className)}
      {...props}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className={cn("h-full w-full object-cover", imgClassName)}
        style={{ filter: "url(#azure-duotone)" }}
      />
      {overlay && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-duo-shadow/80 via-duo-shadow/25 to-transparent"
        />
      )}
    </div>
  );
}
