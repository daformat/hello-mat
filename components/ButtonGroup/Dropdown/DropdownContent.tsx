import { DropdownMenu as DropdownPrimitive } from "radix-ui";
import React from "react";

import { MenuContent } from "../Menu/MenuContent";

export const DropdownContent = React.forwardRef<
  HTMLDivElement,
  DropdownPrimitive.DropdownMenuContentProps
>(({ children, ...props }, ref) => {
  return (
    <DropdownPrimitive.Content asChild {...props}>
      <MenuContent
        ref={ref}
        style={{
          transformOrigin:
            "var(--radix-dropdown-menu-content-transform-origin)",
        }}
      >
        {children}
      </MenuContent>
    </DropdownPrimitive.Content>
  );
});

DropdownContent.displayName = "DropdownContent";
