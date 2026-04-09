import * as React from "react"
import { cn } from "@/lib/utils"

interface ScoreBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
}

export function ScoreBadge({ score, className, ...props }: ScoreBadgeProps) {
  let styleClass = "";
  
  if (score <= 40) {
    styleClass = "bg-[var(--status-danger-subtle)] text-[var(--status-danger)]";
  } else if (score <= 70) {
    styleClass = "bg-[var(--status-warning-subtle)] text-[var(--status-warning)]";
  } else {
    styleClass = "bg-[var(--status-success-subtle)] text-[var(--status-success)]";
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] px-[8px] py-[2px] text-[11px] font-semibold",
        styleClass,
        className
      )}
      {...props}
    >
      {score}
    </div>
  )
}
