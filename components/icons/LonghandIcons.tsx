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

/** Pair of curly quotation marks (DESIGN.md References; drawn at 12 px). */
export function QuoteIcon(props: IconProps) {
  const size = props.size ?? 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={props.className}
    >
      <path d="M7.5 5C5 6 3.5 8.2 3.5 11v2.5H7V10H4" />
      <path d="M14.5 5C12 6 10.5 8.2 10.5 11v2.5H14V10h-3" />
    </svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M11.25 3.75 5.25 9l6 5.25" />
    </Svg>
  );
}

/** Check mark for the Verified button (12 px). */
export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 12}>
      <path {...stroke} d="M3.5 9.25 7.25 13 14.5 5.25" />
    </Svg>
  );
}
