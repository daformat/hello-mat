import { SVGProps } from "react";

import styles from "./svg.module.scss";

export default function SvgPlaceholderSketchfab({
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
        d="M18 34C26.8366 34 34 26.8366 34 18C34 9.16344 26.8366 2 18 2C9.16344 2 2 9.16344 2 18C2 26.8366 9.16344 34 18 34ZM9.99999 23L17 27V19L9.99999 15L9.99999 23ZM9.99999 12.5L18 17L26 12.5L18 8L9.99999 12.5ZM19 27L26 23V15L19 19V27Z"
        fill="currentColor"
      />
    </svg>
  );
}
