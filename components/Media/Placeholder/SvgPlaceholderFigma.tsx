import styles from "./svg.module.scss"
import { SVGProps } from "react"

export default function SvgPlaceholderFigma({
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
        d="M13 3C10.24 3 8 5.24 8 8C8 10.76 10.24 13 13 13C10.24 13 8 15.24 8 18C8 20.76 10.24 23 13 23C10.24 23 8 25.24 8 28C8 30.76 10.24 33 13 33C15.76 33 18 30.76 18 28V23V18C18 20.76 20.24 23 23 23C25.76 23 28 20.76 28 18C28 15.24 25.76 13 23 13C25.76 13 28 10.76 28 8C28 5.24 25.76 3 23 3H18H13ZM23 13C20.24 13 18 15.24 18 18V13H23Z"
        fill="currentColor"
      />
    </svg>
  )
}
