import type { SVGProps } from "react";

/**
 * Lucarne mark — abstract "L" forming the top corner of a goal net.
 * The angle represents the lucarne (top corner) of the goalpost.
 */
export function LucarneMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Net pattern (faint background) */}
      <g opacity="0.35" stroke="currentColor" strokeWidth="0.5">
        <path d="M4 10 L28 10" />
        <path d="M4 16 L28 16" />
        <path d="M4 22 L28 22" />
        <path d="M10 4 L10 28" />
        <path d="M16 4 L16 28" />
        <path d="M22 4 L22 28" />
      </g>
      {/* The L / top-corner angle (the lucarne) */}
      <path
        d="M4 4 L4 16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M4 4 L18 4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Ball lodged in the corner */}
      <circle cx="7" cy="7" r="2.2" fill="currentColor" />
    </svg>
  );
}
