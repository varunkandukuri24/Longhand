/** Inline SVG icons from DESIGN.md. 18×18, 1.5 stroke, round caps/joins. */

import type { ReactNode } from "react";

type IconProps = {
  className?: string;
  size?: number;
};

function Svg({
  size = 18,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M9 3.75v10.5M3.75 9h10.5" />
    </Svg>
  );
}

/** Pair of curly quotation marks. */
export function QuoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M3.75 8.25c0-1.9 1-3.2 2.75-3.75" />
      <path {...stroke} d="M3.75 8.25V13h3" />
      <path {...stroke} d="M10.25 8.25c0-1.9 1-3.2 2.75-3.75" />
      <path {...stroke} d="M10.25 8.25V13h3" />
    </Svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M11.25 3.75 5.25 9l6 5.25" />
    </Svg>
  );
}

/** Check mark for the receipt Verified button (12 px). */
export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 12}>
      <path {...stroke} d="M3.5 9.25 7.25 13 14.5 5.25" />
    </Svg>
  );
}
