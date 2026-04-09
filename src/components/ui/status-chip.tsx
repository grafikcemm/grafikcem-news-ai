import * as React from "react"
import { cn } from "@/lib/utils"

export type StatusType = "draft" | "active" | "done" | "pending";

interface StatusChipProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { class: string, defaultLabel: string }> = {
  draft: { class: "bg-[var(--surface-overlay)] text-[var(--text-tertiary)]", defaultLabel: "Draft" },
  active: { class: "bg-[var(--status-info-subtle)] text-[var(--status-info)]", defaultLabel: "Active" },
  done: { class: "bg-[var(--status-success-subtle)] text-[var(--status-success)]", defaultLabel: "Done" },
  pending: { class: "bg-[var(--status-warning-subtle)] text-[var(--status-warning)]", defaultLabel: "Pending" }
};

export function StatusChip({ status, label, className, ...props }: StatusChipProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-[10px] py-[3px] text-[11px] font-medium",
        config.class,
        className
      )}
      {...props}
    >
      {label || config.defaultLabel}
    </div>
  )
}
