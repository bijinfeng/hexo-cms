import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border-default)] bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        orange:
          "border-[var(--brand-primary-muted)] bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]",
        green:
          "border-[var(--brand-accent-muted)] bg-[var(--brand-accent-subtle)] text-[var(--brand-accent)]",
        success:
          "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]",
        warning:
          "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
        error:
          "border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
