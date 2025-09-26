"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

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
  const [expandedSections, setExpandedSections] = useState<{ triggers: boolean; actions: boolean }>({
    triggers: true,
    actions: true
  });

  const triggers = [
    { key: "manual", title: "Trigger manually", desc: "Run the flow from the UI", imageSrc: "/play.svg" },
    { key: "webhook", title: "On webhook call", desc: "Run when an HTTP request is received", imageSrc: "/webhook.svg" },
  ] as const;

  const toggleSection = (section: 'triggers' | 'actions') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-sidebar text-sidebar-foreground border-l border-sidebar-border rounded-l-lg w-[420px] max-w-[90vw] p-0 top-[4.5rem] h-[calc(100vh-4.5rem)]">
        <SheetHeader className="px-3 py-3 border-b border-sidebar-border">
          <SheetTitle className="text-base text-sidebar-foreground">Add Nodes</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 p-3">
          <div className="sticky top-0 bg-sidebar z-10">
            <label htmlFor="node-search" className="sr-only">Search nodes</label>
            <Input id="node-search" placeholder="Search nodes..." className="h-9" />
          </div>
          
          <div className="mt-2 flex flex-col gap-4">
            {/* Triggers Section */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleSection('triggers')}
                className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-sidebar-foreground hover:bg-foreground/5 transition-colors"
              >
                {expandedSections.triggers ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                <span>Triggers</span>
              </button>
              
              {expandedSections.triggers && (
                <div className="ml-6 flex flex-col divide-y divide-sidebar-border/60">
                  {triggers.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-sidebar-foreground/60">No triggers available</div>
                  ) : triggers.map((item: any) => (
                    <button
                      key={item.key}
                      className="flex items-start gap-3 px-2 py-3 text-left hover:bg-foreground/5 transition-colors"
                      onClick={() => {
                        if (onSelectTrigger) {
                          onSelectTrigger({
                            type: item.key,
                            title: item.title,
                            desc: item.desc,
                            imageSrc: item.imageSrc,
                          } as any);
                        }
                      }}
                    >
                      <img src={item.imageSrc} alt="" className="size-5 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-sidebar-foreground">{item.title}</span>
                        <span className="text-xs text-sidebar-foreground/70">{item.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Section */}
            <div className="flex flex-col">
              <button
                onClick={() => toggleSection('actions')}
                className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-sidebar-foreground hover:bg-foreground/5 transition-colors"
              >
                {expandedSections.actions ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                <span>Actions</span>
              </button>
              
              {expandedSections.actions && (
                <div className="ml-6 flex flex-col divide-y divide-sidebar-border/60">
                  {services.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-sidebar-foreground/60">No actions available</div>
                  ) : services.map((item: any) => (
                    <button
                      key={item.key}
                      className="flex items-start gap-3 px-2 py-3 text-left hover:bg-foreground/5 transition-colors"
                      onClick={() => {
                        if (onSelectService) {
                          onSelectService(item);
                        }
                      }}
                    >
                      <img src={item.imageSrc} alt="" className="size-5 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-sidebar-foreground">{item.title}</span>
                        <span className="text-xs text-sidebar-foreground/70">{item.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
