"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"

type ActionToolbarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ActionToolbar({ open, onOpenChange }: ActionToolbarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-sidebar text-sidebar-foreground border-l border-sidebar-border rounded-l-lg w-[420px] max-w-[90vw] p-0 top-[4.5rem] h-[calc(100vh-4.5rem)]">
        <SheetHeader className="px-3 py-3 border-b border-sidebar-border">
          <SheetTitle className="text-base text-sidebar-foreground">What triggers this workflow?</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 p-3">
          <div className="sticky top-0 bg-sidebar z-10">
            <label htmlFor="node-search" className="sr-only">Search nodes</label>
            <Input id="node-search" placeholder="Search nodes..." className="h-9" />
          </div>
          <div className="mt-2 flex flex-col divide-y divide-sidebar-border/60">
            {[
              { title: "Trigger manually", desc: "Runs the flow on clicking a button. Good for quick start" },
              { title: "On app event", desc: "Runs the flow when something happens in an app" },
              { title: "On a schedule", desc: "Runs the flow every day, hour, or custom interval" },
              { title: "On webhook call", desc: "Runs the flow on receiving an HTTP request" },
              { title: "On form submission", desc: "Generate webforms and pass responses" },
              { title: "When executed by another workflow", desc: "Runs when called by another workflow" },
              { title: "On chat message", desc: "Runs when a user sends a chat message" },
              { title: "When running evaluation", desc: "Run a dataset to test performance" },
              { title: "Other ways...", desc: "Run on errors, file changes, etc." },
            ].map((item) => (
              <button
                key={item.title}
                className="flex flex-col items-start gap-1 px-2 py-3 text-left hover:bg-foreground/5 transition-colors"
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
