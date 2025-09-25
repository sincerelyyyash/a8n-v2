"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiClient, type ApiResponse } from "@/lib/axios";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Switch } from "@/components/ui/switch";

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

// base URL is handled by apiClient

const StatCard = ({ label, value, helper }: { label: string; value: string; helper?: string }) => (
  <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm" role="group" aria-label={label}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
    {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
  </div>
);

export default function WorkflowHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"workflows" | "credentials" | "executions">("workflows");
  const [credentialDialogOpen, setCredentialDialogOpen] = useState<boolean>(false);
  const [credentialQuery, setCredentialQuery] = useState<string>("");
  const [executions] = useState<Execution[]>([]);
  const [creating, setCreating] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createTitle, setCreateTitle] = useState<string>("");
  const [createEnabled, setCreateEnabled] = useState<boolean>(true);
  const [credentials, setCredentials] = useState<Array<{ id: number; title: string; platform: string }>>([]);
  const [credentialsLoading, setCredentialsLoading] = useState<boolean>(false);

  // workflow list controls
  const [sortBy, setSortBy] = useState<"title" | "enabled">("title");
  const [filterEnabled, setFilterEnabled] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // credential create flow
  const [credentialCreateOpen, setCredentialCreateOpen] = useState<boolean>(false);
  const [credentialStep, setCredentialStep] = useState<"select" | "form">("select");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [credTitle, setCredTitle] = useState<string>("");
  const [credData, setCredData] = useState<string>("{}");
  const [credSaving, setCredSaving] = useState<boolean>(false);

  // credential edit flow
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editPlatform, setEditPlatform] = useState<string>("");
  const [editData, setEditData] = useState<string>("{}");
  const [editSaving, setEditSaving] = useState<boolean>(false);

  // execution flow
  const [runWorkflowId, setRunWorkflowId] = useState<number | "">("");
  const [startingExec, setStartingExec] = useState<boolean>(false);
  const [lastExecutionId, setLastExecutionId] = useState<string>("");
  const [lastExecutionStatus, setLastExecutionStatus] = useState<string>("");
  const [polling, setPolling] = useState<boolean>(false);
  const [runNodeId, setRunNodeId] = useState<number | "">("");
  const [startingNodeExec, setStartingNodeExec] = useState<boolean>(false);
  const [execs, setExecs] = useState<Array<{ execution_id: string; status: string; workflow_id: number | null; created_at?: string }>>([]);
  const [execsLoading, setExecsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        setLoading(true);
        setError("");
        if (!user?.id) {
          setWorkflows([]);
          return;
        }
        const res = await apiClient.get<ApiResponse<Workflow[]>>("/api/v1/workflow/all");
        const data = (res.data?.data ?? []) as Workflow[];
        setWorkflows(Array.isArray(data) ? data : []);
      } catch (err) {
        // Treat network or unexpected errors as empty state (no noisy UI errors)
        setWorkflows([]);
        setError("Failed to load workflows");
      } finally {
        setLoading(false);
      }
    };

    void fetchWorkflows();
  }, [user?.id]);

  const filtered = useMemo(() => {
    let arr = workflows;
    if (filterEnabled !== "all") {
      const want = filterEnabled === "active";
      arr = arr.filter((w) => Boolean(w.enabled) === want);
    }
    if (query) {
    const q = query.toLowerCase();
      arr = arr.filter((w) => `${w.title} ${w.name}`.toLowerCase().includes(q));
    }
    const sorted = [...arr].sort((a, b) => {
      if (sortBy === "enabled") return Number(b.enabled) - Number(a.enabled);
      return (a.title || a.name).localeCompare(b.title || b.name);
    });
    return sorted;
  }, [query, workflows, sortBy, filterEnabled]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const providers = useMemo(() => ["Telegram", "Gmail", "Google Gemini"], []);

  const providerResults = useMemo(() => {
    const q = credentialQuery.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.toLowerCase().includes(q));
  }, [credentialQuery, providers]);

  const handleRefreshCredentials = async () => {
    if (!user?.id) {
      toast.error("Sign in to load credentials");
      return;
    }
    try {
      setCredentialsLoading(true);
      const res = await apiClient.get("/api/v1/credential/all");
      const arr = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setCredentials(arr.map((c: any) => ({ id: c.id, title: c.title, platform: c.platform })));
      toast.success("Credentials loaded");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Failed to load credentials";
      toast.error(String(msg));
      setCredentials([]);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const resetCredentialDialog = () => {
    setCredentialStep("select");
    setSelectedPlatform("");
    setCredTitle("");
    setCredData("{}");
  };

  const handleStartCreateCredential = () => {
    setCredentialCreateOpen(true);
    resetCredentialDialog();
  };

  const handleChoosePlatform = (platform: string) => {
    setSelectedPlatform(platform);
    setCredentialStep("form");
  };

  const handleSaveCredential = async () => {
    if (!user?.id) {
      toast.error("You must be signed in to add a credential");
      return;
    }
    const title = credTitle.trim();
    if (!title || !selectedPlatform) {
      toast.error("Title and platform are required");
      return;
    }
    let parsed: any;
    try {
      parsed = credData ? JSON.parse(credData) : {};
    } catch (e) {
      toast.error("Data must be valid JSON");
      return;
    }
    try {
      setCredSaving(true);
      await apiClient.post("/api/v1/credential/create", {
        
        title,
        platform: selectedPlatform,
        data: parsed,
      });
      toast.success("Credential created");
      setCredentialCreateOpen(false);
      resetCredentialDialog();
      await handleRefreshCredentials();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to create credential";
      toast.error(String(msg));
    } finally {
      setCredSaving(false);
    }
  };

  const handleStartExecution = async () => {
    if (!user?.id) {
      toast.error("You must be signed in to run a workflow");
      return;
    }
    if (!runWorkflowId || typeof runWorkflowId !== "number") {
      toast.error("Select a workflow to run");
      return;
    }
    try {
      setStartingExec(true);
      const res = await apiClient.post("/api/v1/execution/workflow", {
        
        workflow_id: runWorkflowId,
        execution_type: "workflow",
      });
      const execId = res.data?.execution_id || res.data?.data?.execution_id || "";
      if (!execId) {
        toast.error("Execution id not returned");
        return;
      }
      setLastExecutionId(execId);
      setLastExecutionStatus(res.data?.status || "queued");
      toast.success("Execution queued");
      void handlePollStatus(execId);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to start execution";
      toast.error(String(msg));
    } finally {
      setStartingExec(false);
    }
  };

  const handleStartNodeExecution = async () => {
    if (!user?.id) {
      toast.error("You must be signed in to run a node");
      return;
    }
    if (!runWorkflowId || typeof runWorkflowId !== "number" || !runNodeId || typeof runNodeId !== "number") {
      toast.error("Select workflow and node id");
      return;
    }
    try {
      setStartingNodeExec(true);
      const res = await apiClient.post("/api/v1/execution/node", {
        
        workflow_id: runWorkflowId,
        node_id: runNodeId,
        execution_type: "node",
      });
      const execId = res.data?.execution_id || res.data?.data?.execution_id || "";
      if (!execId) {
        toast.error("Execution id not returned");
        return;
      }
      setLastExecutionId(execId);
      setLastExecutionStatus(res.data?.status || "queued");
      toast.success("Node execution queued");
      void handlePollStatus(execId);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to start node execution";
      toast.error(String(msg));
    } finally {
      setStartingNodeExec(false);
    }
  };

  const handlePollStatus = async (executionId?: string) => {
    const id = executionId || lastExecutionId;
    if (!id) return;
    try {
      setPolling(true);
      const res = await apiClient.get(`/api/v1/execution/status/${id}`);
      const status = res.data?.status || res.data || "unknown";
      setLastExecutionStatus(String(status));
      if (status === "queued" || status === "processing") {
        setTimeout(() => void handlePollStatus(id), 1500);
      } else if (status === "completed") {
        toast.success("Execution completed");
      } else if (status === "failed") {
        toast.error("Execution failed");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to fetch status";
      toast.error(String(msg));
    } finally {
      setPolling(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId: number) => {
    if (!user?.id) {
      toast.error("You must be signed in");
      return;
    }
    try {
      const confirmed = window.confirm("Delete this workflow? This cannot be undone.");
      if (!confirmed) return;
      await apiClient.delete("/api/v1/workflow/", { params: { workflow_id: workflowId } });
      toast.success("Workflow deleted");
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to delete workflow";
      toast.error(String(msg));
    }
  };

  const openEditCredential = async (credId: number) => {
    if (!user?.id) {
      toast.error("Sign in to edit credentials");
      return;
    }
    try {
      setEditLoading(true);
      setEditOpen(true);
      setEditId(credId);
      const res = await apiClient.get("/api/v1/credential/", { params: { credential_id: credId } });
      const data = res.data?.data || res.data;
      setEditTitle(data?.title || "");
      setEditPlatform(data?.platform || "");
      setEditData(JSON.stringify(data?.data ?? {}, null, 2));
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to load credential";
      toast.error(String(msg));
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveCredentialEdit = async () => {
    if (!user?.id || !editId) return;
    let parsed: any;
    try {
      parsed = editData ? JSON.parse(editData) : {};
    } catch {
      toast.error("Data must be valid JSON");
      return;
    }
    try {
      setEditSaving(true);
      await apiClient.post("/api/v1/credential/update", {
        id: editId,
        
        title: editTitle,
        platform: editPlatform,
        data: parsed,
      });
      toast.success("Credential updated");
      setEditOpen(false);
      await handleRefreshCredentials();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to update credential";
      toast.error(String(msg));
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleEnabled = async (wf: Workflow) => {
    if (!user?.id) { toast.error("Sign in required"); return; }
    try {
      await apiClient.post("/api/v1/workflow/update", { id: wf.id, enabled: !wf.enabled }, { params: { user_id: user.id } });
      setWorkflows((prev) => prev.map((w) => w.id === wf.id ? { ...w, enabled: !w.enabled } : w));
      toast.success(`Workflow ${!wf.enabled ? "enabled" : "disabled"}`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to update workflow";
      toast.error(String(msg));
    }
  };

  // edit workflow dialog state
  const [wfEditOpen, setWfEditOpen] = useState<boolean>(false);
  const [wfEditId, setWfEditId] = useState<number | null>(null);
  const [wfEditTitle, setWfEditTitle] = useState<string>("");
  const [wfEditName, setWfEditName] = useState<string>("");
  const [wfEditEnabled, setWfEditEnabled] = useState<boolean>(true);
  const [wfEditSaving, setWfEditSaving] = useState<boolean>(false);

  const openEditWorkflow = (w: Workflow) => {
    setWfEditId(w.id);
    setWfEditTitle(w.title);
    setWfEditName(w.name);
    setWfEditEnabled(w.enabled);
    setWfEditOpen(true);
  };

  const handleSaveWorkflowEdit = async () => {
    if (!user?.id || !wfEditId) return;
    const name = wfEditName.trim();
    const title = wfEditTitle.trim();
    if (!name || !title) { toast.error("Name and title are required"); return; }
    try {
      setWfEditSaving(true);
      await apiClient.post("/api/v1/workflow/update", { id: wfEditId, name, title, enabled: wfEditEnabled }, { params: { user_id: user.id } });
      setWorkflows((prev) => prev.map((w) => w.id === wfEditId ? { ...w, name, title, enabled: wfEditEnabled } : w));
      toast.success("Workflow updated");
      setWfEditOpen(false);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to update workflow";
      toast.error(String(msg));
    } finally {
      setWfEditSaving(false);
    }
  };

  const WorkflowsEmptyState = () => (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <h2 className="text-lg font-medium">No workflows yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">Create your first workflow to automate tasks</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Button aria-label="Create Workflow" variant="default">Add workflow</Button>
      </div>
    </div>
  );

  const handleRefreshExecutions = async () => {
    if (!user?.id) { toast.error("Sign in to load executions"); return; }
    try {
      setExecsLoading(true);
      const params: any = { user_id: user.id, limit: 20 };
      if (runWorkflowId && typeof runWorkflowId === "number") params.workflow_id = runWorkflowId;
      const res = await apiClient.get("/api/v1/execution/list", { params });
      const arr = Array.isArray(res.data?.data) ? res.data.data : [];
      setExecs(arr);
      toast.success("Executions loaded");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to load executions";
      toast.error(String(msg));
      setExecs([]);
    } finally {
      setExecsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Overview</h1>
        <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
          <Dialog.Trigger asChild>
            <Button aria-label="Create Workflow" className="h-9">Create Workflow</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <Dialog.Title className="text-sm font-medium">Create workflow</Dialog.Title>
                <Dialog.Close asChild>
                  <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">✕</button>
                </Dialog.Close>
              </div>
              <div className="space-y-3 p-4">
                <div className="grid gap-2">
                  <label htmlFor="wf-name" className="text-xs text-muted-foreground">Name</label>
                  <Input id="wf-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="internal-name" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="wf-title" className="text-xs text-muted-foreground">Title</label>
                  <Input id="wf-title" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="My workflow" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={createEnabled}
                    onCheckedChange={(v) => setCreateEnabled(Boolean(v))}
                    aria-label="Toggle enabled"
                  />
                  <span className="text-muted-foreground">Enabled</span>
                </div>
                <div className="pt-2">
                  <Button
                    aria-label="Create"
                    className="w-full"
                    disabled={creating || !createName.trim() || !createTitle.trim() || !user?.id}
                    onClick={async () => {
                      if (!user?.id) {
                        toast.error("You must be signed in to create a workflow");
                        return;
                      }
                      try {
                        setCreating(true);
                        const payload = {
                          name: createName.trim(),
                          title: createTitle.trim(),
                          enabled: createEnabled,
                          
                          nodes: [],
                          connections: [],
                        };
                        const res = await apiClient.post<ApiResponse<{ workflow_id: number }>>("/api/v1/workflow/create", payload);
                        const id = (res.data?.data as any)?.workflow_id;
                        toast.success("Workflow created");
                        setCreateOpen(false);
                        setCreateName("");
                        setCreateTitle("");
                        setCreateEnabled(true);
                        if (id) {
                          router.push(`/workflows/${id}`);
                          return;
                        }
                        try {
                          const listRes = await apiClient.get<ApiResponse<Workflow[]>>("/api/v1/workflow/all");
                          const data = (listRes.data?.data ?? []) as Workflow[];
                          setWorkflows(Array.isArray(data) ? data : []);
                        } catch {}
                      } catch (e: any) {
                        const msg = e?.response?.data?.detail || e?.message || "Failed to create workflow";
                        toast.error(String(msg));
                      } finally {
                        setCreating(false);
                      }
                    }}
                  >
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
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
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Sort by"
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="title">Sort: Title</option>
                <option value="enabled">Sort: Enabled</option>
              </select>
              <select
                aria-label="Filter by status"
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                value={filterEnabled}
                onChange={(e) => { setFilterEnabled(e.target.value as any); setPage(1); }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div role="list" aria-label="Workflows list" className="flex flex-col gap-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading workflows…</div>
            ) : !loading && workflows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <h2 className="text-lg font-medium">No workflows yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">Create your first workflow to automate tasks</p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <Button aria-label="Create Workflow" variant="default" onClick={() => setCreateOpen(true)}>Add workflow</Button>
                </div>
              </div>
            ) : filtered.length === 0 && workflows.length > 0 ? (
              <div className="text-sm text-muted-foreground">No workflows match your search.</div>
            ) : (
              paginated.map((wf) => (
                <div key={wf.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm" role="listitem">
                  <div className="flex min-w-0 flex-col cursor-pointer" onClick={() => router.push(`/workflows/${wf.id}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { router.push(`/workflows/${wf.id}`); } }} aria-label={`Open workflow ${wf.title || wf.name}`}>
                    <div className="truncate text-sm font-medium">{wf.title || wf.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span aria-label="scope" className="rounded-full border border-border bg-background px-2 py-0.5">Personal</span>
                      <span aria-label="status" className="rounded-full border border-border bg-background px-2 py-0.5">{wf.enabled ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button aria-label="toggle status" variant="outline" size="sm" className="px-3" onClick={() => void handleToggleEnabled(wf)}>
                      {wf.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button aria-label="edit workflow" variant="outline" size="sm" onClick={() => openEditWorkflow(wf)}>Edit</Button>
                    <Button aria-label="delete workflow" variant="destructive" size="sm" onClick={() => void handleDeleteWorkflow(wf.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <div>Total {filtered.length}</div>
            <div className="flex items-center gap-2">
              <span>
                <Button aria-label="Previous page" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              </span>
              <span className="rounded-md border border-border px-2 py-1 text-foreground">{page} / {totalPages}</span>
              <span>
                <Button aria-label="Next page" variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </span>
              <select
                aria-label="Page size"
                className="rounded-md border border-border bg-background px-2 py-1"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={10}>10/page</option>
                <option value={20}>20/page</option>
                <option value={50}>50/page</option>
              </select>
            </div>
          </div>

          <Dialog.Root open={wfEditOpen} onOpenChange={setWfEditOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <Dialog.Title className="text-sm font-medium">Edit workflow</Dialog.Title>
                  <Dialog.Close asChild>
                    <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">✕</button>
                  </Dialog.Close>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid gap-2">
                    <label htmlFor="wf-edit-name" className="text-xs text-muted-foreground">Name</label>
                    <Input id="wf-edit-name" value={wfEditName} onChange={(e) => setWfEditName(e.target.value)} placeholder="internal-name" />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="wf-edit-title" className="text-xs text-muted-foreground">Title</label>
                    <Input id="wf-edit-title" value={wfEditTitle} onChange={(e) => setWfEditTitle(e.target.value)} placeholder="My workflow" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      aria-label="Toggle enabled"
                      className={`h-6 w-10 rounded-full border border-border ${wfEditEnabled ? "bg-primary/80" : "bg-muted"}`}
                      onClick={() => setWfEditEnabled((v) => !v)}
                    />
                    <span className="text-muted-foreground">Enabled</span>
                  </div>
                  <div className="pt-2">
                    <Button aria-label="Save workflow" className="w-full" disabled={wfEditSaving} onClick={handleSaveWorkflowEdit}>
                      {wfEditSaving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ) : null}

      {activeTab === "credentials" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Credentials</div>
            <div className="flex items-center gap-2">
              <Dialog.Root open={credentialCreateOpen} onOpenChange={(o) => { setCredentialCreateOpen(o); if (!o) resetCredentialDialog(); }}>
                <Dialog.Trigger asChild>
                  <Button aria-label="Add credential" size="sm" onClick={handleStartCreateCredential}>Add</Button>
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
                      {credentialStep === "select" ? (
                        <div>
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
                                    onClick={() => handleChoosePlatform(p)}
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
                      ) : (
                        <div className="space-y-3">
                          <div className="grid gap-2">
                            <div className="text-xs text-muted-foreground">Platform</div>
                            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">{selectedPlatform}</div>
                          </div>
                          <div className="grid gap-2">
                            <label htmlFor="cred-title2" className="text-xs text-muted-foreground">Title</label>
                            <Input id="cred-title2" value={credTitle} onChange={(e) => setCredTitle(e.target.value)} placeholder={`My ${selectedPlatform} credential`} />
                          </div>
                          <div className="grid gap-2">
                            <label htmlFor="cred-data2" className="text-xs text-muted-foreground">Data (JSON)</label>
                            <textarea
                              id="cred-data2"
                              aria-label="Credential data JSON"
                              className="min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
                              value={credData}
                              onChange={(e) => setCredData(e.target.value)}
                              placeholder='{"apiKey":"..."}'
                            />
                            <div className="text-[10px] text-muted-foreground">Provide provider-specific keys, e.g., apiKey, chatId, etc.</div>
                          </div>
                          <div className="pt-2">
                            <Button aria-label="Create credential" className="w-full" disabled={credSaving || !credTitle.trim()} onClick={handleSaveCredential}>
                              {credSaving ? "Saving..." : "Create credential"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            <Button
              aria-label="Refresh credentials"
              variant="outline"
              size="sm"
                onClick={handleRefreshCredentials}
            >
              Refresh
            </Button>
            </div>
          </div>

          {credentialsLoading ? (
            <div className="text-sm text-muted-foreground">Loading credentials…</div>
          ) : credentials.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <div className="mb-3 text-3xl">👋</div>
              <h2 className="text-lg font-medium">Yash, let's set up a credential</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Credentials let workflows interact with your apps and services
              </p>
              <div className="mt-5 flex items-center justify-center">
                <Button aria-label="Add first credential" variant="outline" onClick={handleStartCreateCredential}>Add first credential</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {credentials.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
                  <div className="flex min-w-0 flex-col">
                    <div className="truncate text-sm font-medium">{c.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.platform}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button aria-label="Edit credential" variant="outline" size="sm" onClick={() => void openEditCredential(c.id)}>Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <Dialog.Title className="text-sm font-medium">Edit credential</Dialog.Title>
                  <Dialog.Close asChild>
                    <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">✕</button>
                  </Dialog.Close>
                </div>
                <div className="p-4 space-y-3">
                  {editLoading ? (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  ) : (
                    <>
                      <div className="grid gap-2">
                        <label htmlFor="edit-title" className="text-xs text-muted-foreground">Title</label>
                        <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="edit-platform" className="text-xs text-muted-foreground">Platform</label>
                        <Input id="edit-platform" value={editPlatform} onChange={(e) => setEditPlatform(e.target.value)} placeholder="Platform" />
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="edit-data" className="text-xs text-muted-foreground">Data (JSON)</label>
                        <textarea
                          id="edit-data"
                          aria-label="Credential data JSON"
                          className="min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
                          value={editData}
                          onChange={(e) => setEditData(e.target.value)}
                        />
                      </div>
                      <div className="pt-2">
                        <Button aria-label="Save changes" className="w-full" disabled={editSaving} onClick={handleSaveCredentialEdit}>
                          {editSaving ? "Saving…" : "Save changes"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ) : null}

      {activeTab === "executions" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Executions</div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="exec-workflow" className="text-xs text-muted-foreground">Workflow</label>
                <select
                  id="exec-workflow"
                  aria-label="Select workflow to run"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
                  value={runWorkflowId}
                  onChange={(e) => setRunWorkflowId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="" disabled>Select workflow…</option>
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>{w.title || w.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button aria-label="Run workflow" className="w-full" disabled={startingExec || !runWorkflowId} onClick={handleStartExecution}>
                  {startingExec ? "Starting…" : "Run workflow"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="exec-node" className="text-xs text-muted-foreground">Node ID</label>
                <Input
                  id="exec-node"
                  aria-label="Enter node id"
                  placeholder="e.g. 12"
                  value={runNodeId}
                  onChange={(e) => setRunNodeId(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div className="flex items-end">
                <Button aria-label="Run node" variant="outline" className="w-full" disabled={startingNodeExec || !runWorkflowId || !runNodeId} onClick={handleStartNodeExecution}>
                  {startingNodeExec ? "Starting…" : "Run node"}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button aria-label="Refresh executions" variant="outline" size="sm" onClick={handleRefreshExecutions} disabled={execsLoading}>{execsLoading ? "Refreshing…" : "Refresh"}</Button>
            </div>

            {lastExecutionId ? (
              <div className="mt-4 rounded-md border border-border bg-muted/20 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Execution ID</span>
                    <span className="font-mono text-xs">{lastExecutionId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {lastExecutionStatus || "queued"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button aria-label="Poll status" variant="outline" size="sm" onClick={() => void handlePollStatus()} disabled={polling}>Check status</Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
            <div className="grid grid-cols-12 border-b border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
              <div className="col-span-5">Workflow</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Started</div>
              <div className="col-span-2 text-right">Exec. ID</div>
            </div>

            {execs.length === 0 ? (
              <div className="p-6">
                <div className="rounded-lg border border-dashed border-border p-10 text-center">
                  <div className="mb-3 text-3xl">🧪</div>
                  <h2 className="text-lg font-medium">No executions yet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Run or refresh to see execution history here</p>
                </div>
              </div>
            ) : (
              execs.map((ex) => (
                <div key={ex.execution_id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                  <div className="col-span-5 truncate">{ex.workflow_id ?? "-"}</div>
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                      {ex.status}
                    </span>
                  </div>
                  <div className="col-span-3 text-muted-foreground">{ex.created_at ? new Date(ex.created_at).toLocaleString() : "-"}</div>
                  <div className="col-span-2 text-right font-mono text-xs">{ex.execution_id}</div>
                </div>
              ))
            )}

            <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">{execs.length} shown</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
