import { ComponentProps } from "react"

import styles from "./Toolbar.module.scss"

export const Toolbar = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    className={[styles.toolbar, className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
)
