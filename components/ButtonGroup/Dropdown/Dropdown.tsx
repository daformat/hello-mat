import { DropdownContent } from "./DropdownContent"
import { DropdownMenu as DropdownPrimitive } from "radix-ui"
import { PropsWithChildren, ReactNode } from "react"

export interface DropdownProps
  extends DropdownPrimitive.DropdownMenuProps,
    PropsWithChildren<{
      trigger: ReactNode
      contentProps?: DropdownPrimitive.DropdownMenuContentProps
    }> {}

export const Dropdown = ({
  contentProps,
  trigger,
  children,
  ...props
}: DropdownProps) => (
  <DropdownPrimitive.Root {...props}>
    <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
    <DropdownPrimitive.Portal>
      <DropdownContent
        collisionPadding={4}
        align={"start"}
        sideOffset={4}
        {...contentProps}
      >
        {children}
      </DropdownContent>
    </DropdownPrimitive.Portal>
  </DropdownPrimitive.Root>
)
