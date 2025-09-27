import React from "react"
import { MenuLabel } from "../Menu/MenuLabel"

import { DropdownMenu as DropdownPrimitive } from "radix-ui"

export const DropdownLabel = React.forwardRef<
  HTMLDivElement,
  DropdownPrimitive.DropdownMenuLabelProps
>(({ children, ...props }, ref) => {
  return (
    <DropdownPrimitive.Label asChild {...props}>
      <MenuLabel ref={ref}>{children}</MenuLabel>
    </DropdownPrimitive.Label>
  )
})

DropdownLabel.displayName = "DropdownLabel"
