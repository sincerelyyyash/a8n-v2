"use client"
import * as React from "react";
import { useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Trash2, Plus } from "lucide-react";

export type MediaTitleNodeData = {
  imageSrc?: string;
  title?: string;
  onClick?: () => void;
  onDelete?: () => void;
  onAddNext?: () => void;
};

export const MediaTitleNode = ({ data }: NodeProps) => {
  const d = (data || {}) as MediaTitleNodeData;
  const title = (d && typeof d.title === "string" && d.title.trim().length > 0)
    ? d.title
    : "Untitled";

  const imageSrc = (d && typeof d.imageSrc === "string" && d.imageSrc.trim().length > 0)
    ? d.imageSrc
    : undefined;

  const handleClick = useCallback(() => {
    if (d && typeof d.onClick === "function") {
      d.onClick();
      return;
    }
  }, [d]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div className="w-48 select-none">
      <div
        role="button"
        tabIndex={0}
        aria-label={String(title)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="group w-full px-3 py-3 rounded-lg border border-border/60 bg-card/50 hover:bg-card/80 hover:border-foreground/40 transition-colors cursor-pointer focus:outline-none relative"
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 size-9 rounded-md border border-border/60 bg-muted overflow-hidden grid place-items-center">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc as string} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs text-muted-foreground">Img</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{String(title)}</p>
            <p className="text-[10px] text-muted-foreground truncate">Click to configure</p>
          </div>
        </div>

        <div className="absolute -top-2 right-2 hidden group-hover:flex items-center gap-1">
          <button
            type="button"
            aria-label="Add next"
            className="size-6 grid place-items-center rounded-md bg-muted border border-border/60 hover:bg-background"
            onClick={(e) => { e.stopPropagation(); d?.onAddNext && d.onAddNext(); }}
          >
            <Plus className="size-3" />
          </button>
          <button
            type="button"
            aria-label="Delete node"
            className="size-6 grid place-items-center rounded-md bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20"
            onClick={(e) => { e.stopPropagation(); d?.onDelete && d.onDelete(); }}
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-foreground/70" />
      <Handle type="source" position={Position.Right} className="!bg-foreground/70" />
    </div>
  );
};

export default MediaTitleNode;


