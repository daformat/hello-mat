import styles from "./svg.module.scss"
import { SVGProps } from "react"

export default function SvgPlaceholderDefault({
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
        d="M18 2C9.16344 2 2 9.16344 2 18C2 26.8366 9.16344 34 18 34C26.8366 34 34 26.8366 34 18C34 9.16344 26.8366 2 18 2ZM24.4438 12.8693C24.7994 12.0396 23.9604 11.2006 23.1307 11.5562L16.1315 14.5559C15.4235 14.8593 14.8593 15.4235 14.5559 16.1315L11.5562 23.1307C11.2006 23.9604 12.0396 24.7994 12.8693 24.4438L19.8685 21.4441C20.5765 21.1407 21.1407 20.5765 21.4441 19.8685L24.4438 12.8693ZM16.1698 17.2456C16.0176 17.0933 15.7592 17.1463 15.6792 17.3463L13.9561 21.6539C13.8582 21.8988 14.1012 22.1418 14.3461 22.0438L18.6537 20.3208C18.8537 20.2408 18.9067 19.9824 18.7544 19.8301L16.1698 17.2456Z"
        fill="currentColor"
      />
    </svg>
  )
}
