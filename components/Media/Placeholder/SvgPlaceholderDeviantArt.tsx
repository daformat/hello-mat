import styles from "./svg.module.scss"
import { SVGProps } from "react"

export default function SvgPlaceholderDeviantArt({
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
        d="M28 2L22.118 2C21.7393 2 21.393 2.214 21.2236 2.55278L18.7764 7.44713C18.607 7.78591 18.2607 7.99991 17.882 7.99991L8.00003 7.99991L8 15.9999H12.3503C13.1013 15.9999 13.5843 16.7967 13.2369 17.4625L8.05672 27.3912C8.01947 27.4626 8.00002 27.542 8.00002 27.6225L8.00002 33.9999L13.8871 33.9999C14.2632 33.9999 14.6075 33.7889 14.7782 33.4538L17.2784 28.5459C17.4491 28.2108 17.7934 27.9999 18.1695 27.9999L28 27.9999L28 19.9999L23.2638 19.9999C22.5172 19.9999 22.0339 19.2113 22.3728 18.5459L27.9455 7.60696C27.9813 7.53666 28 7.45889 28 7.38L28 2Z"
        fill="currentColor"
      />
    </svg>
  )
}
