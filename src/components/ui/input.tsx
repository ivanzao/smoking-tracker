import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full bg-input text-foreground border-2 border-border px-3 py-2 text-base placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-brutal-sm focus:-translate-x-[1px] focus:-translate-y-[1px] transition-transform disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
