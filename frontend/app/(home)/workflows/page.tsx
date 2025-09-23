"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Workflow = {
  id: number;
  name: string;
  title: string;
  enabled: boolean;
};

type Execution = {
  id: string;
  workflowTitle: string;
  status: "Success" | "Error" | "Running";
  startedAt: string; // ISO or display string
  runTimeMs: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const StatCard = ({ label, value, helper }: { label: string; value: string; helper?: string }) => (
  <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm" role="group" aria-label={label}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
    {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
  </div>
);

const WorkflowRow = ({ workflow }: { workflow: Workflow }) => (
  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm" role="listitem">
    <div className="flex min-w-0 flex-col">
      <div className="truncate text-sm font-medium">{workflow.title || workflow.name}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-label="scope" className="rounded-full border border-border bg-background px-2 py-0.5">Personal</span>
        <span aria-label="status" className="rounded-full border border-border bg-background px-2 py-0.5">{workflow.enabled ? "Active" : "Inactive"}</span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Button aria-label="toggle status" variant="outline" size="sm" className="px-3">
        {workflow.enabled ? "Disable" : "Enable"}
      </Button>
      <Button aria-label="more actions" variant="ghost" size="icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
      </Button>
    </div>
  </div>
);

export default function WorkflowHome() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"workflows" | "credentials" | "executions">("workflows");
  const [credentialDialogOpen, setCredentialDialogOpen] = useState<boolean>(false);
  const [credentialQuery, setCredentialQuery] = useState<string>("");
  const [executions] = useState<Execution[]>([]);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        setLoading(true);
        setError("");
        // Determine base URL: env override, otherwise try current host with common server port fallback
        const base = (() => {
          if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, "");
          if (typeof window !== "undefined") {
            const loc = new URL(window.location.href);
            const currentPort = loc.port || (loc.protocol === "https:" ? "443" : "80");
            // Common dev mapping: Next on 3001, API on 8000
            const guessedPort = currentPort === "3000" || currentPort === "3001" ? "8000" : currentPort;
            return `${loc.protocol}//${loc.hostname}:${guessedPort}`;
          }
          return "";
        })();
        const res = await fetch(`${base}/api/v1/workflow/all`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          // Gracefully handle auth/empty cases by showing empty state instead of error
          setWorkflows([]);
          return;
        }
        const json = await res.json();
        const data: Workflow[] = json?.data ?? [];
        setWorkflows(Array.isArray(data) ? data : []);
      } catch (err) {
        // Treat network or unexpected errors as empty state (no noisy UI errors)
        setWorkflows([]);
        setError("");
      } finally {
        setLoading(false);
      }
    };

    void fetchWorkflows();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return workflows;
    const q = query.toLowerCase();
    return workflows.filter((w) => `${w.title} ${w.name}`.toLowerCase().includes(q));
  }, [query, workflows]);

  const providers = useMemo(() => ["Telegram", "Gmail", "Google Gemini"], []);

  const providerResults = useMemo(() => {
    const q = credentialQuery.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.toLowerCase().includes(q));
  }, [credentialQuery, providers]);

  const CredentialsEmptyState = () => (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <div className="mb-3 text-3xl">👋</div>
      <h2 className="text-lg font-medium">Yash, let's set up a credential</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Credentials let workflows interact with your apps and services
      </p>
      <div className="mt-5 flex items-center justify-center">
        <Dialog.Root open={credentialDialogOpen} onOpenChange={setCredentialDialogOpen}>
          <Dialog.Trigger asChild>
            <Button aria-label="Add first credential" variant="outline">Add first credential</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <Dialog.Title className="text-sm font-medium">Add new credential</Dialog.Title>
                <Dialog.Close asChild>
                  <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">✕</button>
                </Dialog.Close>
              </div>
              <div className="p-4">
                <div className="text-sm text-muted-foreground">Select an app or service to connect to</div>
                <div className="mt-3">
                  <div className="relative">
                    <Input
                      aria-label="Search for app"
                      placeholder="Search for app..."
                      value={credentialQuery}
                      onChange={(e) => setCredentialQuery(e.target.value)}
                    />
                    <div className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-card text-card-foreground shadow-sm">
                      {providerResults.map((p) => (
                        <button
                          key={p}
                          className="block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setCredentialDialogOpen(false)}
                        >
                          {p}
                        </button>
                      ))}
                      {providerResults.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground">No results</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );

  const WorkflowsEmptyState = () => (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <h2 className="text-lg font-medium">No workflows yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">Create your first workflow to automate tasks</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Button aria-label="Create Workflow" variant="default">Add workflow</Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Overview</h1>
        <Button aria-label="Create Workflow" className="h-9">Create Workflow</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Prod. executions" value="0" helper="Last 7 days" />
        <StatCard label="Failed prod. executions" value="0" helper="Last 7 days" />
        <StatCard label="Failure rate" value="0%" helper="Last 7 days" />
        <StatCard label="Time saved" value="--" helper="Last 7 days" />
        <StatCard label="Run time (avg.)" value="0s" helper="Last 7 days" />
      </div>

      <div className="flex items-center gap-6">
        <button
          className={`text-sm ${activeTab === "workflows" ? "font-medium text-primary" : "text-muted-foreground"}`}
          aria-current={activeTab === "workflows" ? "page" : undefined}
          tabIndex={0}
          onClick={() => setActiveTab("workflows")}
        >
          Workflows
        </button>
        <button
          className={`text-sm ${activeTab === "credentials" ? "font-medium text-primary" : "text-muted-foreground"}`}
          tabIndex={0}
          onClick={() => setActiveTab("credentials")}
        >
          Credentials
        </button>
        <button
          className={`text-sm ${activeTab === "executions" ? "font-medium text-primary" : "text-muted-foreground"}`}
          tabIndex={0}
          onClick={() => setActiveTab("executions")}
        >
          Executions
        </button>
      </div>

      <Separator />

      {activeTab === "workflows" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Input
                aria-label="Search"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button aria-label="Sort" variant="outline" className="text-xs">Sort by last updated</Button>
              <Button aria-label="Filters" variant="outline" className="text-xs">Filters</Button>
              <Button aria-label="List options" variant="outline" className="text-xs">Options</Button>
            </div>
          </div>

          <div role="list" aria-label="Workflows list" className="flex flex-col gap-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading workflows…</div>
            ) : !loading && workflows.length === 0 ? (
              <WorkflowsEmptyState />
            ) : filtered.length === 0 && workflows.length > 0 ? (
              <div className="text-sm text-muted-foreground">No workflows match your search.</div>
            ) : (
              filtered.map((wf) => <WorkflowRow key={wf.id} workflow={wf} />)
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <div>Total {filtered.length}</div>
            <div className="flex items-center gap-2">
              <span>
                <Button aria-label="Previous page" variant="outline" size="sm">Prev</Button>
              </span>
              <span className="rounded-md border border-border px-2 py-1 text-foreground">1</span>
              <span>
                <Button aria-label="Next page" variant="outline" size="sm">Next</Button>
              </span>
              <Button aria-label="Page size" variant="outline" size="sm">50/page</Button>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === "credentials" ? (
        <CredentialsEmptyState />
      ) : null}

      {activeTab === "executions" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Button aria-label="Filters" variant="outline" size="sm">Filters</Button>
            <div className="text-xs text-muted-foreground">No active executions</div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
            <div className="grid grid-cols-12 border-b border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
              <div className="col-span-5">Workflow</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Started</div>
              <div className="col-span-2">Run Time</div>
              <div className="col-span-1 text-right">Exec. ID</div>
            </div>

            {executions.length === 0 ? (
              <div className="p-6">
                <div className="rounded-lg border border-dashed border-border p-10 text-center">
                  <div className="mb-3 text-3xl">🧪</div>
                  <h2 className="text-lg font-medium">No executions yet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Run a workflow to see execution history here</p>
                </div>
              </div>
            ) : (
              executions.map((ex) => {
                const statusStyles =
                  ex.status === "Success"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : ex.status === "Running"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-destructive/10 text-destructive border-destructive/20";
                return (
                  <div key={ex.id} className={`grid grid-cols-12 items-center px-4 py-3 text-sm ${ex.status === "Error" ? "bg-destructive/10" : ""}`}>
                    <div className="col-span-5 truncate">{ex.workflowTitle}</div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${statusStyles}`}>
                        {ex.status}
                      </span>
                    </div>
                    <div className="col-span-2 text-muted-foreground">{ex.startedAt}</div>
                    <div className="col-span-2 text-muted-foreground">{ex.runTimeMs}ms</div>
                    <div className="col-span-1 text-right">{ex.id}</div>
                  </div>
                );
              })
            )}

            <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">No more executions to fetch</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
