import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function MdTextFields(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M2.5 7.5V5h8v2.5H8V19H5V7.5zm10 4V9h9v2.5h-3V19h-3v-7.5z" />
    </svg>
  );
}

export function MdTextIncrease(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.5 19.5v-1.8l2.15-5.7h1.7l2.15 5.7v1.8h-1.45l-.4-1.15h-2.7l-.4 1.15zm1.9-2.45h1.8l-.9-2.6zm5.1 2.45v-1.3l3.1-.25V8.5h-2.2V7.2h5.9v1.3h-2.2v9.45l3.1.25v1.3zm9.25-8.45v2.15h2.15v1.35h-2.15v2.2h-1.35v-2.2h-2.2V13.2h2.2v-2.15z" />
    </svg>
  );
}

export function MdTextDecrease(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.5 19.5v-1.8l2.15-5.7h1.7l2.15 5.7v1.8h-1.45l-.4-1.15h-2.7l-.4 1.15zm1.9-2.45h1.8l-.9-2.6zm5.1 2.45v-1.3l3.1-.25V8.5h-2.2V7.2h5.9v1.3h-2.2v9.45l3.1.25v1.3zm5.45-6.3h6v1.35h-6z" />
    </svg>
  );
}
