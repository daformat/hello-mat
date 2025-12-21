import { DropdownMenu as DropdownPrimitive } from "radix-ui";
import React from "react";

import { MenuItem, MenuItemProps } from "../Menu/MenuItem";

export interface DropdownItemProps
  extends Omit<DropdownPrimitive.DropdownMenuItemProps, "prefix">,
    MenuItemProps {}

export const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ prefix, suffix, children, ...props }, ref) => {
    return (
      <DropdownPrimitive.Item asChild {...props}>
        <MenuItem ref={ref} {...{ prefix, suffix }}>
          {children}
        </MenuItem>
      </DropdownPrimitive.Item>
    );
  }
);

DropdownItem.displayName = "DropdownItem";
