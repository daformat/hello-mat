import React from "react"
import { MenuItem, MenuItemProps } from "../Menu/MenuItem"

import { DropdownMenu as DropdownPrimitive } from "radix-ui"

export interface DropdownRadioItemProps
  extends Omit<DropdownPrimitive.DropdownMenuRadioItemProps, "prefix">,
    MenuItemProps {}

export const DropdownRadioItem = React.forwardRef<
  HTMLDivElement,
  DropdownRadioItemProps
>(({ prefix, suffix, children, ...props }, ref) => {
  return (
    <DropdownPrimitive.RadioItem asChild {...props}>
      <MenuItem ref={ref} {...{ prefix, suffix }}>
        {children}
      </MenuItem>
    </DropdownPrimitive.RadioItem>
  )
})

DropdownRadioItem.displayName = "DropdownRadioItem"
