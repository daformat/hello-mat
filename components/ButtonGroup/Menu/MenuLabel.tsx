import React from "react"

import styles from "./MenuLabel.module.scss"

export const MenuLabel = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren
>(({ children }, ref) => {
  return (
    <div className={styles.menu_label} ref={ref}>
      <span className={styles.label}>{children}</span>
    </div>
  )
})

MenuLabel.displayName = "MenuLabel"
