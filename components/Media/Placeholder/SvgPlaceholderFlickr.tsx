import { SVGProps } from "react";

import styles from "./svg.module.scss";

export default function SvgPlaceholderFlickr({
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
        d="M11.404 2.096C13.1107 2.01867 13.6547 2 18 2C22.3453 2 22.8907 2.01867 24.5987 2.09733C30.4147 2.364 33.6427 5.59867 33.904 11.404C33.9813 13.1107 34 13.6547 34 18C34 22.3453 33.9813 22.8907 33.9027 24.5973C33.64 30.4133 30.4027 33.6373 24.5973 33.904C22.8907 33.9813 22.3453 34 18 34C13.6547 34 13.1107 33.9813 11.4027 33.904C5.58667 33.6373 2.36267 30.408 2.096 24.5973C2.01867 22.8907 2 22.3453 2 18C2 13.6547 2.01867 13.1107 2.09733 11.4027C2.364 5.58667 5.59333 2.36267 11.404 2.096ZM17 18C17 20.7614 14.7614 23 12 23C9.23858 23 7 20.7614 7 18C7 15.2386 9.23858 13 12 13C14.7614 13 17 15.2386 17 18ZM29 18C29 20.7614 26.7614 23 24 23C21.2386 23 19 20.7614 19 18C19 15.2386 21.2386 13 24 13C26.7614 13 29 15.2386 29 18Z"
        fill="currentColor"
      />
    </svg>
  );
}
