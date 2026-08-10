import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  subtitle?: string;
  showValue?: boolean;
  variant?: "default" | "danger" | "warning";
  className?: string;
}

const variantStyles = {
  default: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  subtitle,
  showValue = true,
  variant = "default",
  className,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("space-y-1", className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-sm items-end gap-2">
          <div className="flex flex-col min-w-0">
            {label && <span className="text-slate-600 dark:text-slate-300 truncate">{label}</span>}
            {subtitle && <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{subtitle}</span>}
          </div>
          {showValue && <span className="font-medium text-slate-900 dark:text-white shrink-0">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn("h-full rounded-full transition-all duration-500", variantStyles[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
