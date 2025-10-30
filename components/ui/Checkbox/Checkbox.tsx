import { ComponentProps, useId } from "react"

import styles from "./Checkbox.module.scss"
import { isNonNullable } from "@/utils/nullable"

export const Checkbox = ({
  className,
  id,
  ...props
}: ComponentProps<"input">) => {
  const generatedId = useId()
  return (
    <label
      className={styles.checkbox}
      htmlFor={id || generatedId}
      aria-label="Checkbox"
      onClick={(event) => {
        const checkbox = event.currentTarget.querySelector(
          "input[type='checkbox']"
        )
        if (checkbox instanceof HTMLInputElement && !checkbox.disabled) {
          checkbox.click()
        }
      }}
    >
      <input
        type="checkbox"
        className={[className, styles.input].filter(isNonNullable).join(" ")}
        id={id}
        {...props}
      />
      <span className={styles.checkmark}>
        <svg
          className={styles.full}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 7.5L6 10.5L10.5 3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          className={styles.partial}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 7H10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </label>
  )
}
