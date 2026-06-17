import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingIndicatorProps = {
  label?: string;
  className?: string;
  iconClassName?: string;
};

export function LoadingIndicator({
  label = "Memuat",
  className,
  iconClassName,
}: LoadingIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-500", className)}>
      <Loader2 className={cn("size-4 animate-spin text-emerald-600", iconClassName)} />
      {label}
    </span>
  );
}
