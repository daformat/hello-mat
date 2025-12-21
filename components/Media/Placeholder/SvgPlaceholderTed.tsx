import { SVGProps } from "react";

import styles from "./svg.module.scss";

export default function SvgPlaceholderTed({
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
        d="M5 14.9999H2V11.9999H12V14.9999H9V23.9999H5V14.9999ZM13 11.9999H22V14.9999H16V16.4999H22V19.4999H16V20.9999H22V23.9999H13V11.9999ZM23 11.9999H28.7941C32.6469 11.9999 34 14.9728 34 17.9999C34 21.6755 32.1254 23.9999 28.0998 23.9999H23V11.9999ZM26 20.9999H28C31 20.9999 31 19.1169 31 17.9999C31 17.2428 31 14.9999 28 14.9999H26V20.9999Z"
        fill="currentColor"
      />
    </svg>
  );
}
