import React from "react"
import { DropdownSubContent } from "./DropdownSubContent"

import { DropdownMenu as DropdownPrimitive } from "radix-ui"

export interface ContextMenuSubProps
  extends DropdownPrimitive.DropdownMenuProps,
    React.PropsWithChildren<{
      trigger: React.ReactNode
      triggerAsChild?: boolean
      contentProps?: DropdownPrimitive.DropdownMenuSubContentProps
    }> {}

export const DropdownSub = ({
  contentProps,
  trigger,
  triggerAsChild,
  children,
  ...props
}: ContextMenuSubProps) => (
  <DropdownPrimitive.Sub {...props}>
    <DropdownPrimitive.SubTrigger asChild={triggerAsChild}>
      {trigger}
    </DropdownPrimitive.SubTrigger>

    <DropdownPrimitive.Portal>
      <DropdownSubContent
        alignOffset={-5.5}
        collisionPadding={4}
        {...contentProps}
      >
        {children}
      </DropdownSubContent>
    </DropdownPrimitive.Portal>
  </DropdownPrimitive.Sub>
)
