"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { cn } from "../../utils"

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.Trigger

const CollapsibleContent = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>) => (
  <CollapsiblePrimitive.Content
    className={cn(
      "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  >
    <div className="pb-1">{children}</div>
  </CollapsiblePrimitive.Content>
)

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
