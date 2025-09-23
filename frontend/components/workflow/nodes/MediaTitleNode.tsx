"use client"
import * as React from "react";
import { useCallback } from "react";
import type { NodeProps } from "@xyflow/react";

export type MediaTitleNodeData = {
  imageSrc?: string;
  title?: string;
  onClick?: () => void;
};

export const MediaTitleNode = ({ data }: NodeProps<MediaTitleNodeData>) => {
  const title = (data && typeof data.title === "string" && data.title.trim().length > 0)
    ? data.title
    : "Untitled";

  const imageSrc = (data && typeof data.imageSrc === "string" && data.imageSrc.trim().length > 0)
    ? data.imageSrc
    : undefined;

  const handleClick = useCallback(() => {
    if (data && typeof data.onClick === "function") {
      data.onClick();
      return;
    }
  }, [data]);

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
        aria-label={title}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-3 rounded-lg border border-border/60 bg-card/50 hover:bg-card/80 hover:border-foreground/40 transition-colors cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 size-9 rounded-md border border-border/60 bg-muted overflow-hidden grid place-items-center">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs text-muted-foreground">Img</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{title}</p>
            <p className="text-[10px] text-muted-foreground truncate">Click to configure</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaTitleNode;


