import { SVGProps } from "react";

import styles from "./svg.module.scss";

export default function SvgPlaceholderTwitch({
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 7.5L7.5 4H32V20.875L26 26H19L11 34V26H5V7.5ZM19 17H16V10H19V17ZM23 17H26V10H23V17Z"
        fill="currentColor"
      />
    </svg>
  );
}
