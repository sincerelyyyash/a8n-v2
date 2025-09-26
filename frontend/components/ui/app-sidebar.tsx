"use client"

import { Home, Plus, User, Boxes, Variable, BarChart2, HelpCircle, BellDot, Database } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/axios"
import { toast } from "sonner"
import * as Dialog from "@radix-ui/react-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Primary Menu items.
const primaryItems = [
  { title: "Overview", url: "#", icon: Home },
]

// Secondary Menu items (lower section)
const secondaryItems = [
  { title: "Admin Panel", url: "#", icon: Database },
  { title: "Templates", url: "#", icon: Boxes },
  { title: "Variables", url: "#", icon: Variable },
  { title: "Insights", url: "#", icon: BarChart2 },
  { title: "Help", url: "#", icon: HelpCircle },
  { title: "What’s New", url: "#", icon: BellDot },
]

export function AppSidebar() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [workflowName, setWorkflowName] = useState("")
  const [workflowTitle, setWorkflowTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleCreateWorkflow = async () => {
    if (!workflowName.trim() || !workflowTitle.trim()) {
      toast.error("Please fill in both name and title")
      return
    }

    setIsCreating(true)
    try {
      const response = await apiClient.post("/api/v1/workflow/create", {
        name: workflowName.trim(),
        title: workflowTitle.trim(),
        enabled: false,
        nodes: [],
        connections: []
      })

      if (response.data?.workflow_id) {
        toast.success("Workflow created successfully!")
        setIsDialogOpen(false)
        setWorkflowName("")
        setWorkflowTitle("")
        // Navigate to the new workflow
        router.push(`/workflows/${response.data.workflow_id}`)
      }
    } catch (error: any) {
      console.error("Error creating workflow:", error)
      toast.error(error.response?.data?.detail || "Failed to create workflow")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Sidebar className="bg-sidebar border border-sidebar-border rounded-lg h-[calc(100vh-1rem)] overflow-hidden mt-2 ml-2 mr-2">
      <SidebarContent className="px-1 pb-2 bg-sidebar flex h-full flex-col overflow-hidden">
        {/* Header */}
        <SidebarHeader className="flex items-center justify-between p-3">
          <div className="text-foreground font-medium tracking-wide">a8n</div>
          {/* <button className="size-8 grid place-items-center rounded-md border border-border/60 text-foreground/80 hover:text-foreground hover:border-foreground/50 transition-colors">
            <Plus className="size-4" />
          </button> */}
        </SidebarHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Primary group */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {primaryItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="lg">
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />
          {/* Workflows Section */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground">Workflows</SidebarGroupLabel>
            <SidebarGroupContent>
              <button 
                onClick={() => setIsDialogOpen(true)}
                className="mt-2 w-full inline-flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-foreground/90 hover:text-foreground hover:border-foreground/60 transition-colors"
              >
                <Plus className="size-4" />
                <span>Add workflow</span>
              </button>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />
          {/* Secondary group */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* {secondaryItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="lg">
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))} */}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />
        </div>
        {/* Footer user pill */}
        <SidebarFooter className="mt-auto">
          <a href="#" className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm text-foreground/90 hover:text-foreground hover:border-foreground/60 transition-colors">
            <span className="inline-flex items-center gap-2">
              <span className="size-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 grid place-items-center text-[10px] text-white">YT</span>
              <span>Yash Thakur</span>
            </span>
            <span className="text-muted-foreground">···</span>
          </a>
        </SidebarFooter>
      </SidebarContent>

      {/* Create Workflow Dialog */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">Create New Workflow</Dialog.Title>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="workflow-name" className="block text-sm font-medium mb-2">
                  Workflow Name
                </label>
                <Input
                  id="workflow-name"
                  type="text"
                  placeholder="Enter workflow name"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label htmlFor="workflow-title" className="block text-sm font-medium mb-2">
                  Workflow Title
                </label>
                <Input
                  id="workflow-title"
                  type="text"
                  placeholder="Enter workflow title"
                  value={workflowTitle}
                  onChange={(e) => setWorkflowTitle(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <Button variant="outline" disabled={isCreating}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button 
                onClick={handleCreateWorkflow} 
                disabled={isCreating || !workflowName.trim() || !workflowTitle.trim()}
              >
                {isCreating ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Sidebar>
  )
}
