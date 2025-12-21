import { DropdownMenu as DropdownPrimitive } from "radix-ui";
import React from "react";

import { MenuSeparator } from "../Menu/MenuSeparator";

export const DropdownSeparator = React.forwardRef<
  HTMLDivElement,
  DropdownPrimitive.DropdownMenuSeparatorProps
>((props, ref) => {
  return (
    <DropdownPrimitive.Separator asChild {...props}>
      <MenuSeparator ref={ref} />
    </DropdownPrimitive.Separator>
  );
});

DropdownSeparator.displayName = "DropdownSeparator";
