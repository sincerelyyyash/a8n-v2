import * as React from "react";
import { useCallback } from "react";
import type { NodeProps } from "@xyflow/react";

export function CreateFirstNode({ data }: NodeProps) {
  const label = (data && typeof (data as any).label === 'string') ? (data as any).label : "Add First Step";
  const handleClick = useCallback(() => {
    if (data && typeof (data as any).onClick === 'function') {
      (data as any).onClick();
      return;
    }
  }, [data]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div className="first-step-node">
      <div className="w-44 h-20 flex-col border border-dashed border-border/60 rounded-lg bg-transparent flex items-center justify-center gap-1.5 transition-colors hover:border-foreground/40 hover:bg-foreground/5">
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Add first step"
          tabIndex={0}
          className="size-8 rounded-full text-foreground/80 hover:text-foreground border border-border/60 hover:border-foreground/50 bg-transparent transition-colors focus:outline-none"
        >
          {"+"}
        </button>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
