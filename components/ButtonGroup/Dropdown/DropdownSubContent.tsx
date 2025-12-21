import { DropdownMenu as DropdownPrimitive } from "radix-ui";
import React from "react";

import { MenuContent } from "../Menu/MenuContent";

export const DropdownSubContent = React.forwardRef<
  HTMLDivElement,
  DropdownPrimitive.DropdownMenuSubContentProps
>(({ children, ...props }, ref) => {
  return (
    <DropdownPrimitive.SubContent asChild {...props}>
      <MenuContent
        ref={ref}
        style={{
          transformOrigin:
            "var(--radix-dropdown-menu-content-transform-origin)",
        }}
      >
        {children}
      </MenuContent>
    </DropdownPrimitive.SubContent>
  );
});

DropdownSubContent.displayName = "ContextMenuSubContent";
