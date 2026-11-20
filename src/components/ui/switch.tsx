import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & { size?: "sm" | "default" }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "group/switch relative inline-flex h-5 w-8 shrink-0 cursor-pointer items-center rounded-full bg-border p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[size=sm]:h-4 data-[size=sm]:w-6 motion-reduce:transition-none data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-background transition-transform group-data-[size=sm]/switch:size-3 motion-reduce:transition-none data-checked:translate-x-[calc(100%-4px)]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
