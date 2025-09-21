import styles from "./svg.module.scss"
import { SVGProps } from "react"

export default function SvgPlaceholderGoogleMaps({
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
        d="M18 34C18.5978 33.9977 18.8719 33.5866 19.082 32.9476C20.0252 29.9788 21.9119 27.417 23.7888 24.8684C26.4038 21.3176 29 17.7923 29 13.2276C29 7.11606 24.1768 2.02365 18 2C11.8232 2.02365 7 7.11606 7 13.2276C7 17.7923 9.59619 21.3176 12.2112 24.8684C14.0881 27.417 15.9748 29.9788 16.918 32.9476C17.1281 33.5866 17.4022 33.9977 18 34ZM18 17C20.2091 17 22 15.2091 22 13C22 10.7909 20.2091 9 18 9C15.7909 9 14 10.7909 14 13C14 15.2091 15.7909 17 18 17Z"
        fill="currentColor"
      />
    </svg>
  )
}
