import styles from "./svg.module.scss"
import { SVGProps } from "react"

export default function SvgPlaceholderError({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <span>
      <svg
        className={`${styles.monochrome} ${className}`}
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...rest}
      >
        <rect x="6" y="8" width="2" height="2" fill="currentColor" />
        <rect x="24" y="8" width="2" height="2" fill="currentColor" />
        <rect x="8" y="10" width="2" height="2" fill="currentColor" />
        <rect x="26" y="10" width="2" height="2" fill="currentColor" />
        <rect x="10" y="8" width="2" height="2" fill="currentColor" />
        <rect x="28" y="8" width="2" height="2" fill="currentColor" />
        <rect x="10" y="12" width="2" height="2" fill="currentColor" />
        <rect x="28" y="12" width="2" height="2" fill="currentColor" />
        <rect x="6" y="12" width="2" height="2" fill="currentColor" />
        <rect x="24" y="12" width="2" height="2" fill="currentColor" />
        <rect x="16" y="19" width="2" height="2" fill="currentColor" />
        <rect x="18" y="19" width="2" height="2" fill="currentColor" />
        <rect x="18" y="17" width="2" height="2" fill="currentColor" />
        <rect x="18" y="15" width="2" height="2" fill="currentColor" />
        <rect x="9" y="26" width="2" height="2" fill="currentColor" />
        <rect x="11" y="24" width="2" height="2" fill="currentColor" />
        <rect x="13" y="24" width="2" height="2" fill="currentColor" />
        <rect x="15" y="24" width="2" height="2" fill="currentColor" />
        <rect x="17" y="24" width="2" height="2" fill="currentColor" />
        <rect x="19" y="24" width="2" height="2" fill="currentColor" />
        <rect x="21" y="24" width="2" height="2" fill="currentColor" />
        <rect x="23" y="24" width="2" height="2" fill="currentColor" />
        <rect x="25" y="26" width="2" height="2" fill="currentColor" />
      </svg>
    </span>
  )
}
