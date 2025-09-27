import styles from "./MenuSeparator.module.scss"
import React from "react"

export const MenuSeparator = React.forwardRef<HTMLDivElement, never>(
  (_props, ref) => {
    return <div className={styles.separator} ref={ref} />
  }
)

MenuSeparator.displayName = "MenuSeparator"
