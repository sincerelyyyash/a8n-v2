"use client"

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Plus } from "lucide-react"

interface WorkflowPageAppbarProps {
  workflowInfo?: { name?: string; title?: string; id?: number };
}

export default function WorkflowPageAppbar({ workflowInfo }: WorkflowPageAppbarProps) {
  // Component to display workflow information in the appbar
  const { state } = useSidebar()
  const isSidebarCollapsed = state === "collapsed"
  return (
    <div className="flex items-center justify-between bg-sidebar border border-sidebar-border rounded-lg mt-2 mb-2 px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 mx-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <SidebarTrigger />
        {isSidebarCollapsed && (
          <div className="text-xs sm:text-sm font-medium tracking-wide text-sidebar-foreground">a8n</div>
        )}
        <div className="h-4 w-px bg-sidebar-border hidden sm:block" />
        {workflowInfo?.title || workflowInfo?.name ? (
          <div className="flex items-center gap-2">
            <div className="text-xs sm:text-sm font-medium text-sidebar-foreground">
              {workflowInfo.title || workflowInfo.name}
            </div>
            {workflowInfo.id && (
              <div className="text-xs text-sidebar-foreground/60">
                (ID: {workflowInfo.id})
              </div>
            )}
          </div>
        ) : workflowInfo?.id ? (
          <div className="text-xs sm:text-sm font-medium text-sidebar-foreground">
            Workflow ID: {workflowInfo.id}
          </div>
        ) : (
          <div className="text-xs text-sidebar-foreground/70">Workflow</div>
        )}
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <button 
          className="text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-md border border-sidebar-border text-sidebar-foreground/80 hover:text-sidebar-foreground hover:border-sidebar-foreground/60 transition-colors"
          onClick={() => {
            const ev = new CustomEvent("toggle-action-toolbar");
            window.dispatchEvent(ev);
          }}
          aria-label="Toggle action toolbar"
        >
          <Plus className="size-3 sm:size-4" />
        </button>
        <button className="text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-md border border-sidebar-border text-sidebar-foreground/80 hover:text-sidebar-foreground hover:border-sidebar-foreground/60 transition-colors" onClick={() => {
          const ev = new CustomEvent("open-save-workflow-dialog");
          window.dispatchEvent(ev);
        }}>
          Save
        </button>
      </div>
    </div>
  )
}
