import React from "react"
import { FaChevronRight } from "react-icons/fa6"
import { MenuItem, MenuItemProps } from "../Menu/MenuItem"

export const DropdownSubTrigger = React.forwardRef<
  HTMLDivElement,
  MenuItemProps
>(({ children, ...props }, ref) => {
  return (
    <MenuItem ref={ref} suffix={<FaChevronRight />} {...props}>
      {children}
    </MenuItem>
  )
})

DropdownSubTrigger.displayName = "DropdownSubTrigger"
