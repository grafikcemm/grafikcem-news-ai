import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className, 
  ...props 
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 space-y-4",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="text-[var(--text-tertiary)] flex justify-center mb-2 [&_svg]:w-12 [&_svg]:h-12">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-heading text-[var(--text-primary)]">{title}</h3>
        <p className="text-body text-[var(--text-secondary)] max-w-sm mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
