import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white hover:brightness-110 focus-visible:ring-[var(--accent)]",
        secondary:
          "bg-[var(--accent-2)] text-[var(--accent-3)] hover:brightness-105 focus-visible:ring-[var(--accent-2)]",
        outline:
          "border border-[var(--border-strong)] bg-[var(--panel)] text-[var(--foreground)] hover:border-[var(--accent-2)] hover:bg-[var(--panel-2)] focus-visible:ring-[var(--accent)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--panel-2)] focus-visible:ring-[var(--accent)]",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-11 rounded-md px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
