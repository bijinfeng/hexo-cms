type SkeletonVariant = "text" | "card" | "circle" | "rect";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ variant = "text", className = "", width, height }: SkeletonProps) {
  const base = "bg-[var(--bg-muted)] animate-pulse";

  const variants: Record<SkeletonVariant, string> = {
    text: "h-4 rounded",
    card: "h-32 rounded-xl",
    circle: "rounded-full",
    rect: "rounded-lg",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return <div className={`${base} ${variants[variant]} ${className}`} style={style} />;
}

export function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <Skeleton variant="rect" width={36} height={36} />
      </div>
      <Skeleton width={80} className="mb-2" />
      <Skeleton width={60} height={12} />
    </div>
  );
}
