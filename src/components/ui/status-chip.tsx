import * as React from "react"
import { cn } from "@/lib/utils"

export type StatusType = "draft" | "active" | "done" | "pending" | "published";

interface StatusChipProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { class: string, defaultLabel: string }> = {
  draft: { class: "bg-[var(--surface-elevated)] text-[var(--text-tertiary)]", defaultLabel: "Taslak" },
  active: { class: "bg-[var(--info-subtle)] text-[var(--info)]", defaultLabel: "Aktif" },
  done: { class: "bg-[var(--success-subtle)] text-[var(--success)]", defaultLabel: "Tamamlandı" },
  pending: { class: "bg-[var(--warning-subtle)] text-[var(--warning)]", defaultLabel: "Bekliyor" },
  published: { class: "bg-[var(--success-subtle)] text-[var(--success)]", defaultLabel: "Yayınlandı" },
};

export function StatusChip({ status, label, className, ...props }: StatusChipProps) {
  const config = statusConfig[status] || statusConfig.draft;

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
