import { type CSSProperties } from "react";
import { Card } from "./ui/card";
import { Skeleton as ShadcnSkeleton } from "./ui/skeleton";
import { cn } from "../utils";

type SkeletonVariant = "text" | "card" | "circle" | "rect";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ variant = "text", className = "", width, height }: SkeletonProps) {
  const variants: Record<SkeletonVariant, string> = {
    text: "h-4",
    card: "h-32 rounded-xl",
    circle: "rounded-full",
    rect: "rounded-lg",
  };

  const style: CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return <ShadcnSkeleton className={cn(variants[variant], className)} style={style} />;
}

export function SkeletonCard() {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between">
        <Skeleton variant="rect" width={36} height={36} />
      </div>
      <Skeleton width={80} className="mb-2" />
      <Skeleton width={60} height={12} />
    </Card>
  );
}
