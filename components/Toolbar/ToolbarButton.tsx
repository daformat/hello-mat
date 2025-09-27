import { ComponentProps, forwardRef } from "react"
import styles from "./ToolbarButton.module.scss"

export const ToolbarButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button">
>(({ children, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={[styles.toolbar_button, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  )
})

ToolbarButton.displayName = "ToolbarButton"
