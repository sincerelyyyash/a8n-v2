"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"

type ActionToolbarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTrigger?: (trigger: {
    type: "manual" | "app_event" | "schedule" | "webhook" | "form" | "child_workflow" | "chat_message" | "evaluation" | "other";
    title: string;
    desc: string;
    imageSrc?: string;
  }) => void
  mode?: "trigger" | "service"
  services?: Array<{ key: string; title: string; desc: string; imageSrc?: string }>
  onSelectService?: (service: { key: string; title: string; desc: string; imageSrc?: string }) => void
}

export default function ActionToolbar({ open, onOpenChange, onSelectTrigger, mode = "trigger", services = [], onSelectService }: ActionToolbarProps) {
  const triggers = [
    { key: "manual", title: "Trigger manually", desc: "Run the flow from the UI" },
    { key: "webhook", title: "On webhook call", desc: "Run when an HTTP request is received" },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-sidebar text-sidebar-foreground border-l border-sidebar-border rounded-l-lg w-[420px] max-w-[90vw] p-0 top-[4.5rem] h-[calc(100vh-4.5rem)]">
        <SheetHeader className="px-3 py-3 border-b border-sidebar-border">
          <SheetTitle className="text-base text-sidebar-foreground">{mode === "trigger" ? "What triggers this workflow?" : "Add a service"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 p-3">
          <div className="sticky top-0 bg-sidebar z-10">
            <label htmlFor="node-search" className="sr-only">Search nodes</label>
            <Input id="node-search" placeholder="Search nodes..." className="h-9" />
          </div>
          <div className="mt-2 flex flex-col divide-y divide-sidebar-border/60">
            {(mode === "trigger" ? triggers : services).map((item: any) => (
              <button
                key={item.key}
                className="flex flex-col items-start gap-1 px-2 py-3 text-left hover:bg-foreground/5 transition-colors"
                onClick={() => {
                  if (mode === "trigger") {
                    if (onSelectTrigger) {
                      onSelectTrigger({
                        type: item.key,
                        title: item.title,
                        desc: item.desc,
                        imageSrc: item.key === "webhook" ? "/file.svg" : undefined,
                      } as any);
                    }
                  } else if (onSelectService) {
                    onSelectService(item);
                  }
                }}
              >
                <span className="text-sm text-sidebar-foreground">{item.title}</span>
                <span className="text-xs text-sidebar-foreground/70">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
