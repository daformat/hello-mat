import { SVGProps } from "react";

import styles from "./svg.module.scss";

export default function SvgPlaceholderSoundCloud({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={`${styles.monochrome} ${className}`}
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        d="M30.324 17.0697C29.8215 17.0697 29.3392 17.1789 28.9042 17.3756C28.6108 13.8036 25.8352 11 22.4527 11C21.9119 11 20.0133 11.038 20 11.9394C20 12.9862 20 22.2371 20 24.5014C20 24.7776 20.2239 25 20.5 25H30.3274C32.3542 25 34 23.2231 34 21.0312C34 18.8429 32.3542 17.0697 30.324 17.0697Z"
        fill="currentColor"
      />
      <path d="M18.5 12V24" stroke="currentColor" strokeLinecap="round" />
      <path d="M16.5 13V24" stroke="currentColor" strokeLinecap="round" />
      <path d="M14.5 15V24" stroke="currentColor" strokeLinecap="round" />
      <path d="M12.5 14V24" stroke="currentColor" strokeLinecap="round" />
      <path d="M10.5 16V24" stroke="currentColor" strokeLinecap="round" />
      <path d="M8.5 17V24" stroke="currentColor" strokeLinecap="round" />
      <path d="M6.5 18V23.5" stroke="currentColor" strokeLinecap="round" />
      <path d="M4.5 19V23" stroke="currentColor" strokeLinecap="round" />
      <path d="M2.5 20V22" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}
