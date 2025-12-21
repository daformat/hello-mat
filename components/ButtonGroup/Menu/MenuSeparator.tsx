import React, { ComponentProps } from "react";

import styles from "./MenuSeparator.module.scss";

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
  );
});

MenuSeparator.displayName = "MenuSeparator";
