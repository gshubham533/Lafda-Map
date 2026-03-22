"use client";

import { Button } from "@/components/ui/button";
import {
  FILTER_OPTIONS,
  type IncidentFilter,
} from "@/lib/incidents";
import { cn } from "@/lib/utils";

type Props = {
  value: IncidentFilter;
  onChange: (v: IncidentFilter) => void;
  className?: string;
};

export function FilterChips({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "flex max-w-full flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden rounded-xl border border-border/80 bg-card/95 p-1.5 shadow-md backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label="Incident categories"
    >
      {FILTER_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            variant={active ? "default" : "outline"}
            size="sm"
            className="h-8 shrink-0 touch-manipulation rounded-lg text-xs"
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
