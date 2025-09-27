import React from "react"
import { MenuSeparator } from "../Menu/MenuSeparator"

import { DropdownMenu as DropdownPrimitive } from "radix-ui"

export const DropdownSeparator = React.forwardRef<
  HTMLDivElement,
  DropdownPrimitive.DropdownMenuSeparatorProps
>((props, ref) => {
  return (
    <DropdownPrimitive.Separator asChild {...props}>
      <MenuSeparator ref={ref} />
    </DropdownPrimitive.Separator>
  )
})

DropdownSeparator.displayName = "DropdownSeparator"
