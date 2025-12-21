import { SVGProps } from "react";

import styles from "./svg.module.scss";

export default function SvgPlaceholderImage({
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
        d="M6 4C3.79086 4 2 5.79086 2 8V28C2 30.2091 3.79086 32 6 32H30C32.2091 32 34 30.2091 34 28V8C34 5.79086 32.2091 4 30 4H6ZM22.9999 14C22.9999 15.1046 22.1045 16 20.9999 16C19.8954 16 18.9999 15.1046 18.9999 14C18.9999 12.8954 19.8954 12 20.9999 12C22.1045 12 22.9999 12.8954 22.9999 14ZM8.51823 23.2226L13.6407 15.539C13.8224 15.2664 14.2127 15.2393 14.4304 15.4842L22 24H8.93426C8.53491 24 8.29672 23.5549 8.51823 23.2226ZM20.4146 20.0162L24.0001 24H27.9128C28.34 24 28.5704 23.4989 28.2924 23.1746L23.3795 17.4429C23.18 17.2101 22.8198 17.2101 22.6203 17.4429L20.4146 20.0162Z"
        fill="currentColor"
      />
    </svg>
  );
}
