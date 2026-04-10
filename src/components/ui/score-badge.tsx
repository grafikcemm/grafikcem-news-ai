import * as React from "react"
import { cn } from "@/lib/utils"

interface ScoreBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
}

export function ScoreBadge({ score, className, ...props }: ScoreBadgeProps) {
  let styleClass = "";
  
  if (score <= 40) {
    styleClass = "bg-[var(--danger-subtle)] text-[var(--danger)]";
  } else if (score <= 70) {
    styleClass = "bg-[var(--warning-subtle)] text-[var(--warning)]";
  } else {
    styleClass = "bg-[var(--success-subtle)] text-[var(--success)]";
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] px-[8px] py-[2px] text-[11px] font-bold",
        styleClass,
        className
      )}
      {...props}
    >
      {score}
    </div>
  )
}
