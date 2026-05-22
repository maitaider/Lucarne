import type { SVGProps } from "react";

export function WorldTrophyMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M21.5 12.5h21v8.8c0 9.1-4.2 15.2-10.5 18-6.3-2.8-10.5-8.9-10.5-18v-8.8Z"
        fill="currentColor"
        opacity=".18"
      />
      <path
        d="M21.5 12.5h21v8.8c0 9.1-4.2 15.2-10.5 18-6.3-2.8-10.5-8.9-10.5-18v-8.8Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M21.5 17.2h-6c0 7.6 2.9 13 9.8 15.9M42.5 17.2h6c0 7.6-2.9 13-9.8 15.9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M32 39.3v8.2M24.8 51.5h14.4M21.8 56.5h20.4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M32 19.1l2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7 2.2-4.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function OrbitBallMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="18" fill="currentColor" opacity=".14" />
      <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M32 20.8 42.4 28l-4 12.2H25.6l-4-12.2L32 20.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m21.6 28-6.1-1.9M42.4 28l6.1-1.9M25.6 40.2l-3.8 5M38.4 40.2l3.8 5M32 20.8v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M11.5 36.6c7.8 12.9 28.7 16.5 43.2 5.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".45"
      />
      <path
        d="M52.5 27.4C44.7 14.5 23.8 10.9 9.3 22"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".45"
      />
    </svg>
  );
}

export function TerminalGridMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="10"
        y="14"
        width="44"
        height="36"
        rx="5"
        fill="currentColor"
        opacity=".12"
      />
      <rect
        x="10"
        y="14"
        width="44"
        height="36"
        rx="5"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M18 24h13M37 24h9M18 32h9M33 32h13M18 40h16M40 40h6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M10 28h44M24 14v36M39 14v36"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity=".35"
      />
    </svg>
  );
}

export function StadiumBeamMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M9 46c9.4-8.5 36.6-8.5 46 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M14 40c7.4-5.5 28.6-5.5 36 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".55"
      />
      <rect x="14" y="16" width="11" height="8" rx="2" fill="currentColor" opacity=".16" />
      <rect x="39" y="16" width="11" height="8" rx="2" fill="currentColor" opacity=".16" />
      <path
        d="M19.5 24 12 38M44.5 24 52 38M16 16h7M41 16h7M19.5 12v4M44.5 12v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 28h30M15 33h34"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity=".32"
      />
    </svg>
  );
}
