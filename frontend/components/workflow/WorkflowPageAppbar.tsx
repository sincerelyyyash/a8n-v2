"use client"

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"

export default function WorkflowPageAppbar() {
  const { state } = useSidebar()
  const isSidebarCollapsed = state === "collapsed"
  return (
    <div className="flex items-center justify-between bg-sidebar border border-sidebar-border rounded-lg my-2 px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 mx-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <SidebarTrigger />
        {isSidebarCollapsed && (
          <div className="text-xs sm:text-sm font-medium tracking-wide text-sidebar-foreground">a8n</div>
        )}
        <div className="h-4 w-px bg-sidebar-border hidden sm:block" />
        {/* <div className="text-xs text-sidebar-foreground/70">What triggers this workflow?</div> */}
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <button className="text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-md border border-sidebar-border text-sidebar-foreground/80 hover:text-sidebar-foreground hover:border-sidebar-foreground/60 transition-colors">
          Save
        </button>
      </div>
    </div>
  )
}
