import styles from "./svg.module.scss"
import { SVGProps } from "react"

export default function SvgPlaceholderYoutube({
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
        d="M33.6947 12.2825C33.2682 8.41971 30.6423 5.87615 26.8259 5.46049C21.1882 4.84646 14.8118 4.84646 9.1741 5.46049C5.35768 5.87615 2.73176 8.41971 2.30525 12.2825C1.89836 15.9676 1.89814 20.0317 2.30525 23.7188C2.72377 27.5092 5.28479 30.1172 9.1741 30.5408C14.7954 31.153 21.2046 31.153 26.8259 30.5408C30.7152 30.1172 33.2762 27.5092 33.6947 23.7188C34.1016 20.0337 34.1019 15.9696 33.6947 12.2825ZM15.6359 12.6812C15.136 12.3813 14.5 12.7414 14.5 13.3244V22.6751C14.5 23.2581 15.136 23.6181 15.6359 23.3182L23.4281 18.6428C23.9136 18.3515 23.9136 17.6479 23.4281 17.3566L15.6359 12.6812Z"
        fill="currentColor"
      />
    </svg>
  )
}
