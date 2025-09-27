import React from "react"
import { MenuItem, MenuItemProps } from "../Menu/MenuItem"

import ChevronRight from "../Icons/svg/ChevronRight"

export const DropdownSubTrigger = React.forwardRef<
  HTMLDivElement,
  MenuItemProps
>(({ children, ...props }, ref) => {
  return (
    <MenuItem ref={ref} suffix={<ChevronRight />} {...props}>
      {children}
    </MenuItem>
  )
})

DropdownSubTrigger.displayName = "DropdownSubTrigger"
