import { Home, Plus, User, Boxes, Variable, BarChart2, HelpCircle, BellDot, Database } from "lucide-react"

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
  { title: "Personal", url: "#", icon: User },
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
  return (
    <Sidebar className="bg-sidebar border border-sidebar-border rounded-lg m-2 h-[calc(100vh-1rem)] overflow-hidden">
      <SidebarContent className="px-2 pb-2 bg-sidebar flex h-full flex-col">
        {/* Header */}
        <SidebarHeader className="flex items-center justify-between p-3">
          <div className="text-foreground font-medium tracking-wide">a8n</div>
          {/* <button className="size-8 grid place-items-center rounded-md border border-border/60 text-foreground/80 hover:text-foreground hover:border-foreground/50 transition-colors">
            <Plus className="size-4" />
          </button> */}
        </SidebarHeader>

        {/* Primary group */}
        <SidebarGroup className="px-1">
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
        {/* Projects Section */}
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="text-muted-foreground">Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <button className="mt-2 w-full inline-flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm text-foreground/90 hover:text-foreground hover:border-foreground/60 transition-colors">
              <Plus className="size-4" />
              <span>Add project</span>
            </button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />
        {/* Secondary group */}
        <SidebarGroup className="px-1">
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
        {/* Footer user pill */}
        <SidebarFooter className="mt-auto px-1">
          <a href="#" className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm text-foreground/90 hover:text-foreground hover:border-foreground/60 transition-colors">
            <span className="inline-flex items-center gap-2">
              <span className="size-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 grid place-items-center text-[10px] text-white">YT</span>
              <span>Yash Thakur</span>
            </span>
            <span className="text-muted-foreground">···</span>
          </a>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  )
}
