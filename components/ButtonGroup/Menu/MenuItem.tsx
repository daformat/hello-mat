import React, { ReactNode } from "react";

import styles from "./MenuItem.module.scss";

export type MenuItemProps = React.PropsWithChildren<{
  prefix?: ReactNode;
  suffix?: ReactNode;
  displayAction?: boolean;
  className?: string;
}>;

export const MenuItem = React.forwardRef<HTMLDivElement, MenuItemProps>(
  ({ children, prefix, suffix, displayAction, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[styles.menu_item, className].filter(Boolean).join(" ")}
        {...props}
      >
        {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
        <span className={styles.label}>
          <span className={styles.text_label}>{children}</span>
        </span>
        {suffix || displayAction ? (
          <span className={styles.suffix}>
            {suffix}
            {displayAction ? <div className={styles.enter} /> : null}
          </span>
        ) : null}
      </div>
    );
  }
);

MenuItem.displayName = "MenuItem";
