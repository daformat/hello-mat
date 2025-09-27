import styles from "./MenuSeparator.module.scss"
import React, { ComponentProps } from "react"

export const MenuSeparator = React.forwardRef<
  HTMLDivElement,
  ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={[styles.separator, className].filter(Boolean).join(" ")}
      {...props}
    />
  )
})

MenuSeparator.displayName = "MenuSeparator"
