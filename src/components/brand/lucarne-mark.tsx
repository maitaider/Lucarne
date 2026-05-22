import type { SVGProps } from "react";

/**
 * Lucarne mark — a sharp goal-corner monogram inside a broadcast-style crest.
 */
export function LucarneMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M20 3.5 33 8.1v10.6c0 8.2-4.9 14.6-13 17.8C11.9 33.3 7 26.9 7 18.7V8.1L20 3.5Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M20 4.9 31.6 9v9.4c0 7.2-4.3 12.6-11.6 15.5C12.7 31 8.4 25.6 8.4 18.4V9L20 4.9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity="0.95"
      />
      <path
        d="M14 25.2V13.8h13"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M18 17.8h8.7M18 21.4h7M17.8 13.8v10.5M21.6 13.8v7.6M25.4 13.8v5.6"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.46"
      />
      <path
        d="M13.7 13.8h5.1l-5.1 5.1v-5.1Z"
        fill="currentColor"
        opacity="0.96"
      />
      <circle cx="17.1" cy="17.4" r="2.3" fill="currentColor" />
    </svg>
  );
}

export function LucarneLogo({
  label = "Lucarne",
  className = "",
  markClassName = "",
  textClassName = "",
}: {
  label?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative inline-flex">
        <LucarneMark
          className={`size-8 text-primary-500 drop-shadow-[0_0_18px_rgba(34,217,130,0.24)] ${markClassName}`}
        />
      </span>
      <span
        className={`font-display text-lg font-semibold text-text-primary ${textClassName}`}
      >
        {label}
      </span>
    </span>
  );
}
