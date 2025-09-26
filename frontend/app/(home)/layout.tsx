import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
import WorkflowPageAppbar from "@/components/workflow/WorkflowPageAppbar"
import { AuthProvider } from "@/components/providers/auth-provider"
import RequireAuth from "@/components/auth/RequireAuth"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (

    <AuthProvider>
      <RequireAuth>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <main className="flex flex-col w-full h-full bg-sidebar">
              <WorkflowPageAppbar />
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </RequireAuth>
    </AuthProvider>

  )
}
