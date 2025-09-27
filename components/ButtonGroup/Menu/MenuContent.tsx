import { ComponentProps, forwardRef } from "react"
import styles from "./MenuContent.module.scss"

export const MenuContent = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={[styles.menu_content, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  )
)

MenuContent.displayName = "MenuContent"
