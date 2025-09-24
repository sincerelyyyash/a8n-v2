"use client"
import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, useReactFlow, Edge, type NodeTypes, type NodeProps, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CreateFirstNode } from './nodes/FirstNode';
import { MediaTitleNode } from './nodes/MediaTitleNode';
import ActionToolbar from './ActionToolbar';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { useSidebar } from "@/components/ui/sidebar";
import * as Dialog from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/axios";
import { toast } from "sonner";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAuth } from "@/components/providers/auth-provider";

const nodeTypes: NodeTypes = {
  firstNode: CreateFirstNode,
  mediaTitle: MediaTitleNode as unknown as React.ComponentType<NodeProps>,
};

// Lightweight JSON code field with tab support and auto-format on blur
const JsonCodeField = ({ value, onChange, placeholder }: { value: unknown; onChange: (v: string) => void; placeholder?: string }) => {
  const str = typeof value === 'string' ? value : (value ? JSON.stringify(value, null, 2) : '');
  return (
    <textarea
      className="min-h-40 font-mono text-[12px] rounded-md border border-border bg-background p-2 leading-5 outline-none focus:ring-2 focus:ring-ring/50"
      value={str}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const el = e.currentTarget;
          const start = el.selectionStart ?? 0;
          const end = el.selectionEnd ?? 0;
          const newVal = str.slice(0, start) + '  ' + str.slice(end);
          onChange(newVal);
          setTimeout(() => {
            try { el.selectionStart = el.selectionEnd = start + 2; } catch {}
          }, 0);
        }
      }}
      onBlur={(e) => {
        const text = e.target.value.trim();
        if (!text) return;
        try {
          const formatted = JSON.stringify(JSON.parse(text), null, 2);
          if (formatted !== text) onChange(formatted);
        } catch {
          // keep text; validation happens on save
        }
      }}
    />
  );
};

const initialNodes: Node[] = [
  {
    id: 'first-node',
    type: 'firstNode',
    position: { x: 0, y: 0 },
    data: { label: 'Add First Step' },
  },
];

const initialEdges: Edge[] = [];

export default function ReactFlowComponent() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<Node[]>(initialNodes as Node[]);
  const [edges, setEdges] = useState(initialEdges);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [toolbarMode, setToolbarMode] = useState<"trigger" | "service">("trigger");
  const [pendingEdgeFrom, setPendingEdgeFrom] = useState<string | null>(null);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookMethod, setWebhookMethod] = useState("POST");
  const [webhookPath, setWebhookPath] = useState("/my-webhook");
  const [webhookHeader, setWebhookHeader] = useState("X-Webhook-Secret");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [configDialog, setConfigDialog] = useState<{ open: boolean; nodeId: string | null; schemaKey: string | null }>({ open: false, nodeId: null, schemaKey: null });
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [configTitle, setConfigTitle] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>("");
  const [saveTitle, setSaveTitle] = useState<string>("");
  const [saveEnabled, setSaveEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [credentials, setCredentials] = useState<Array<{ id: number; title: string; platform: string }>>([]);
  const [credDialogOpen, setCredDialogOpen] = useState<boolean>(false);
  const [credTitle, setCredTitle] = useState<string>("");
  const [credPlatform, setCredPlatform] = useState<string>("");
  const [credData, setCredData] = useState<string>("");
  const [creatingCred, setCreatingCred] = useState<boolean>(false);
  const [varSelect, setVarSelect] = useState<Record<string, string>>({});
  const [varPanelOpen, setVarPanelOpen] = useState<Record<string, boolean>>({});

  // Listen for Save button event from appbar
  React.useEffect(() => {
    const handler = () => setSaveDialogOpen(true);
    window.addEventListener("open-save-workflow-dialog", handler);
    return () => window.removeEventListener("open-save-workflow-dialog", handler);
  }, []);

  React.useEffect(() => {
    const loadCreds = async () => {
      if (!user?.id) return;
      try {
        const res = await apiClient.get('/api/v1/credential/all', { params: { user_id: user.id } });
        const arr = Array.isArray(res.data) ? res.data : [];
        setCredentials(arr.map((c: any) => ({ id: c.id, title: c.title, platform: c.platform })));
      } catch {}
    };
    void loadCreds();
  }, [user?.id]);

  const SERVICE_FORMS: Record<string, { title: string; fields: Array<{ key: string; label: string; type: "text" | "textarea" | "boolean" | "json" }> }> = {
    ai_model: {
      title: "Message a model",
      fields: [
        { key: "credential_id", label: "Model credential", type: "text" },
        { key: "messages", label: "Messages (newline separated)", type: "textarea" },
        { key: "formatted_response", label: "Structured output", type: "boolean" },
        { key: "user_schema", label: "Structured output schema (JSON only)", type: "json" },
      ],
    },
    send_email: {
      title: "Send email",
      fields: [
        { key: "credential_id", label: "Email credential", type: "text" },
        { key: "receiver_email", label: "Receiver email", type: "text" },
        { key: "subject", label: "Subject", type: "text" },
        { key: "msg", label: "Message", type: "textarea" },
      ],
    },
    send_email_and_wait: {
      title: "Send email and wait for reply",
      fields: [
        { key: "credential_id", label: "Email credential", type: "text" },
        { key: "receiver_email", label: "Receiver email", type: "text" },
        { key: "subject", label: "Subject", type: "text" },
        { key: "msg", label: "Message", type: "textarea" },
        { key: "wait_timeout_seconds", label: "Wait timeout seconds", type: "text" },
        { key: "poll_interval_seconds", label: "Poll interval seconds", type: "text" },
      ],
    },
    telegram_message: {
      title: "Send Telegram message",
      fields: [
        { key: "credential_id", label: "Telegram credential", type: "text" },
        { key: "chat_id", label: "Chat ID", type: "text" },
        { key: "message_text", label: "Message text", type: "textarea" },
      ],
    },
  };

  const SERVICE_PLATFORM: Record<string, string> = {
    ai_model: "llm",
    send_email: "email",
    send_email_and_wait: "email",
    telegram_message: "telegram",
  };

  const getImmediateUpstream = useCallback((nodeId: string) => {
    const incoming = edges.filter((e) => e.target === nodeId).map((e) => e.source);
    return nodes.filter((n) => incoming.includes(n.id)).map((n: any) => ({ id: n.id, title: (n?.data?.title as string) || n.id }));
  }, [edges, nodes]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: any) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const onNodeClick = useCallback((_event: any, node: any) => {
    if (node?.id === 'first-node') {
      setToolbarOpen(true);
    }
  }, []);

  const onInit = useCallback((instance: any) => {
    // Center the coordinate (0,0) in the viewport
    instance.setCenter(0, 0, { zoom: 1, duration: 300 });
  }, []);

  const FloatingControls = () => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    return (
      <div className="absolute bottom-6 left-6 z-[200]">
        <div className="bg-card/90 backdrop-blur border border-border rounded-md shadow-sm flex items-center gap-1 p-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomOut()}
            className="size-9 grid place-items-center rounded-md text-foreground/80 hover:text-foreground border border-transparent hover:border-border/80 transition-colors"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomIn()}
            className="size-9 grid place-items-center rounded-md text-foreground/80 hover:text-foreground border border-transparent hover:border-border/80 transition-colors"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Fit view"
            onClick={() => fitView({ padding: 0.2, duration: 200 })}
            className="size-9 grid place-items-center rounded-md text-foreground/80 hover:text-foreground border border-transparent hover:border-border/80 transition-colors"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>
    );
  };

  // Only show the first node when there are no other nodes
  const computedNodes = useMemo(() => {
    const nonFirst = nodes.filter((n) => n.id !== 'first-node');
    if (nonFirst.length > 0) return nonFirst;
    // No user nodes → return a fresh placeholder node (avoid reusing state)
    return [
      {
        id: 'first-node',
        type: 'firstNode',
        position: { x: 0, y: 0 },
        data: { label: 'Add First Step' },
      } as Node,
    ];
  }, [nodes]);

  // Ensure controlled state always contains placeholder when empty so ReactFlow has a node to render
  React.useEffect(() => {
    if (nodes.length === 0) {
      setNodes(initialNodes);
    }
  }, [nodes.length]);

  return (
    <div className="w-full h-[calc(100vh-4.5rem)] bg-sidebar px-2 pb-0 pt-0">
      <div className="w-full h-full bg-sidebar/90 rounded-lg border border-sidebar-border p-2">
        <ReactFlow
          className="bg-sidebar/95 rounded-lg"
        nodes={computedNodes.map((n) =>
          n.id === 'first-node'
            ? { ...n, data: { ...n.data, onClick: () => setToolbarOpen(true) } }
            : n
        )}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onInit={onInit}
        >
          <FloatingControls />
        </ReactFlow>
      </div>
      <ActionToolbar
        open={toolbarOpen}
        onOpenChange={(o) => { setToolbarOpen(o); if (!o) setPendingEdgeFrom(null); }}
        mode={toolbarMode}
        services={[
          { key: 'ai_model', title: SERVICE_FORMS.ai_model.title, desc: 'Send prompts to an LLM', imageSrc: '/globe.svg' },
          { key: 'send_email', title: SERVICE_FORMS.send_email.title, desc: 'Deliver an email via SMTP', imageSrc: '/file.svg' },
          { key: 'send_email_and_wait', title: SERVICE_FORMS.send_email_and_wait.title, desc: 'Email then wait for reply', imageSrc: '/file.svg' },
          { key: 'telegram_message', title: SERVICE_FORMS.telegram_message.title, desc: 'Send a Telegram message', imageSrc: '/globe.svg' },
        ]}
        onSelectTrigger={(t) => {
          setToolbarOpen(false);
          const baseNode = {
            id: `trigger-${Date.now()}`,
            type: 'mediaTitle',
            position: { x: 0, y: 0 },
            data: {
              title: t.title,
              imageSrc: t.imageSrc,
              onClick: () => {
                if (t.type === 'webhook') {
                  setWebhookDialogOpen(true);
                }
              },
              onDelete: () => {
                setNodes((prev) => prev.filter((n) => n.id !== baseNode.id));
                setEdges((prev) => prev.filter((e) => e.source !== baseNode.id && e.target !== baseNode.id));
              },
              onAddNext: () => { setToolbarMode('service'); setToolbarOpen(true); setPendingEdgeFrom(baseNode.id); },
              triggerType: t.type,
            },
          } as const;
          setNodes((prev) => {
            const withoutFirst = prev.filter((n) => n.id !== 'first-node');
            return [...withoutFirst, baseNode];
          });
          if (t.type === 'webhook') {
            setWebhookDialogOpen(true);
          }
        }}
        onSelectService={(service) => {
          const id = `node-${Date.now()}`;
          const src = pendingEdgeFrom ? nodes.find((n) => n.id === pendingEdgeFrom) : undefined;
          const OFFSET_X = 240; const OFFSET_Y_VAR = 80;
          const pos = {
            x: (src?.position?.x ?? 0) + OFFSET_X,
            y: (src?.position?.y ?? 0) + Math.round((Math.random() - 0.5) * 2 * OFFSET_Y_VAR),
          };
          const newNode = {
            id,
            type: 'mediaTitle',
            position: pos,
            data: {
              title: service.title,
              imageSrc: service.imageSrc,
              onClick: () => {
                // hydrate form from existing data when reopening
                setConfigDialog({ open: true, nodeId: id, schemaKey: service.key });
                const node = nodes.find((n) => n.id === id) as any;
                const existing = node?.data?.service?.data ?? {};
                setConfigForm(existing);
                setConfigTitle((node?.data?.title as string) || service.title);
              },
              onDelete: () => {
                setNodes((prev) => prev.filter((n) => n.id !== id));
                setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
              },
              onAddNext: () => { setToolbarMode('service'); setToolbarOpen(true); setPendingEdgeFrom(id); },
              service: { key: service.key, data: {} },
            },
          } as const;
          setNodes((prev) => [...prev, newNode]);
          if (pendingEdgeFrom) {
            setEdges((prev) => addEdge({ id: `e-${pendingEdgeFrom}-${id}`, source: pendingEdgeFrom, target: id }, prev));
          }
          setToolbarOpen(false);
          setPendingEdgeFrom(null);
          setConfigDialog({ open: true, nodeId: id, schemaKey: service.key });
          setConfigForm((s) => (service.key === 'ai_model' ? { formatted_response: false, ...s } : s));
          setConfigTitle(service.title);
        }}
      />

      <Dialog.Root open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <Dialog.Title className="text-sm font-medium">Configure Webhook Trigger</Dialog.Title>
              <Dialog.Close asChild>
                <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">✕</button>
              </Dialog.Close>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid gap-2">
                <label htmlFor="wh-name" className="text-xs text-muted-foreground">Name</label>
                <Input id="wh-name" value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="Webhook name" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="wh-method" className="text-xs text-muted-foreground">HTTP Method</label>
                <Input id="wh-method" value={webhookMethod} onChange={(e) => setWebhookMethod(e.target.value)} placeholder="POST" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="wh-path" className="text-xs text-muted-foreground">Path</label>
                <Input id="wh-path" value={webhookPath} onChange={(e) => setWebhookPath(e.target.value)} placeholder="/my-webhook" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="wh-header" className="text-xs text-muted-foreground">Secret Header (optional)</label>
                <Input id="wh-header" value={webhookHeader} onChange={(e) => setWebhookHeader(e.target.value)} placeholder="X-Webhook-Secret" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="wh-secret" className="text-xs text-muted-foreground">Secret (optional)</label>
                <Input id="wh-secret" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="secret-value" />
              </div>
              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    // Update the latest trigger node's data with webhook config
                    setNodes((prev) => {
                      const next = [...prev];
                      for (let i = next.length - 1; i >= 0; i -= 1) {
                        const n = next[i] as any;
                        if (n?.data?.triggerType === 'webhook') {
                          next[i] = {
                            ...n,
                            data: {
                              ...n.data,
                              title: webhookName || 'Webhook',
                              webhook: {
                                method: webhookMethod,
                                path: webhookPath,
                                header: webhookHeader,
                                secret: webhookSecret,
                              },
                            },
                          };
                          break;
                        }
                      }
                      return next;
                    });
                    setWebhookDialogOpen(false);
                    toast.success('Webhook configured');
                  }}
                >
                  Save
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                Your webhook URL will be available after saving the workflow. Example: <code className="rounded bg-muted px-1">/api/v1/webhook{webhookPath}</code>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Generic Service Config Dialog */}
      <DialogPrimitive.Root open={configDialog.open} onOpenChange={(o) => setConfigDialog((s) => ({ ...s, open: o }))}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <DialogPrimitive.Title className="text-sm font-medium">{configDialog.schemaKey ? SERVICE_FORMS[configDialog.schemaKey]?.title || 'Configure Step' : 'Configure Step'}</DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">✕</button>
              </DialogPrimitive.Close>
            </div>
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid gap-2">
                <label htmlFor="cfg-title" className="text-xs text-muted-foreground">Title</label>
                <Input id="cfg-title" placeholder="Step title" value={configTitle} onChange={(e) => {
                  const value = e.target.value;
                  setConfigTitle(value);
                  if (!configDialog.nodeId) return;
                  setNodes((prev) => prev.map((n) => n.id === configDialog.nodeId ? { ...n, data: { ...(n as any).data, title: value } } : n));
                }} />
              </div>

              {configDialog.schemaKey && SERVICE_FORMS[configDialog.schemaKey] ? (
                <div className="space-y-4">
                  {SERVICE_FORMS[configDialog.schemaKey].fields.map((f) => {
                    if (configDialog.schemaKey === 'ai_model' && f.key === 'user_schema' && !configForm.formatted_response) {
                      return null;
                    }
                    return (
                    <div key={f.key} className="grid gap-2">
                      <label className="text-xs text-muted-foreground">{f.label}</label>
                      <div>
                      {f.key === 'credential_id' ? (
                        (() => {
                          const platform = configDialog.schemaKey ? SERVICE_PLATFORM[configDialog.schemaKey] : undefined;
                          const options = platform ? credentials.filter(c => c.platform === platform) : credentials;
                          const selectedId = (configForm['credential_id'] ?? (options[0]?.id)) as number | undefined;
                          const selected = options.find(c => c.id === selectedId);
                          if (!options.length) {
                            return (
                              <button
                                type="button"
                                className="text-xs rounded-md border border-border px-2 py-2 hover:bg-muted"
                                onClick={() => setCredDialogOpen(true)}
                              >Add {platform || ''} credential</button>
                            );
                          }
                          return (
                            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                              <select
                                className="bg-transparent text-sm outline-none"
                                value={selectedId}
                                onChange={(e) => setConfigForm((s) => ({ ...s, credential_id: Number(e.target.value) }))}
                              >
                                {options.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.title} ({opt.platform})</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="text-xs rounded-md border border-border px-2 py-1 hover:bg-muted"
                                onClick={() => setCredDialogOpen(true)}
                              >Add new</button>
                            </div>
                          );
                        })()
                      ) : f.type === 'text' ? (
                        <Input
                          value={configForm[f.key] ?? ''}
                          onChange={(e) => setConfigForm((s) => ({ ...s, [f.key]: e.target.value }))}
                        />
                      ) : f.type === 'textarea' ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            className="text-[11px] rounded-md border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
                            onClick={() => setVarPanelOpen((o) => ({ ...o, [f.key]: !o[f.key] }))}
                          >{varPanelOpen[f.key] ? 'Hide variables' : 'Use previous node output'}</button>
                          {varPanelOpen[f.key] ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <select
                                className="rounded-md border border-border bg-background px-2 py-1"
                                value={varSelect[f.key] ?? ''}
                                onChange={(e) => setVarSelect((vs) => ({ ...vs, [f.key]: e.target.value }))}
                              >
                                <option value="">Select previous node output</option>
                                {configDialog.nodeId && getImmediateUpstream(configDialog.nodeId).map(src => (
                                  <option key={src.id} value={`{{${src.id}.result}}`}>{src.title} (result)</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="rounded-md border border-border px-2 py-1 hover:bg-muted"
                                onClick={() => {
                                  const token = varSelect[f.key];
                                  if (!token) return;
                                  setConfigForm((s) => ({ ...s, [f.key]: ((s[f.key] ?? '') + (s[f.key] ? '\n' : '') + token) }));
                                }}
                              >Add</button>
                            </div>
                          ) : null}
                          <textarea
                            className="min-h-24 rounded-md border border-border bg-background p-2 text-sm"
                            value={configForm[f.key] ?? ''}
                            onChange={(e) => setConfigForm((s) => ({ ...s, [f.key]: e.target.value }))}
                          />
                          <div className="text-[11px] text-muted-foreground">Tip: Use variables like {'{{node-id.result}}'} to reference a previous node's output.</div>
                        </div>
                      ) : f.type === 'boolean' ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(configForm[f.key])}
                            onCheckedChange={(checked) => setConfigForm((s) => ({ ...s, [f.key]: checked }))}
                          />
                          <span className="text-xs text-muted-foreground">{configForm[f.key] ? 'On' : 'Off'}</span>
                        </div>
                      ) : (
                        <JsonCodeField
                          value={configForm[f.key] ?? ''}
                          placeholder='{"key":"value"}'
                          onChange={(text) => setConfigForm((s) => ({ ...s, [f.key]: text }))}
                        />
                      )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : null}
              <div className="pt-2">
                <Button className="w-full" onClick={() => {
                  if (!configDialog.nodeId) return;
                  const key = configDialog.schemaKey || '';
                  // parse JSON fields
                  const formCopy: Record<string, any> = { ...configForm };
                  const fields = key && SERVICE_FORMS[key] ? SERVICE_FORMS[key].fields : [];
                  for (const f of fields) {
                    if (f.type === 'json' && typeof formCopy[f.key] === 'string') {
                      try {
                        formCopy[f.key] = formCopy[f.key] ? JSON.parse(formCopy[f.key]) : {};
                      } catch {
                        toast.error(`Invalid JSON for ${f.label}`);
                        return;
                      }
                    }
                    if (f.key.includes('seconds')) {
                      const n = Number(formCopy[f.key]);
                      if (!Number.isNaN(n)) formCopy[f.key] = n;
                    }
                  }
                  setNodes((prev) => prev.map((n) => n.id === configDialog.nodeId ? { ...n, data: { ...(n as any).data, service: { key, data: formCopy } } } : n));
                  setConfigDialog({ open: false, nodeId: null, schemaKey: null });
                  setConfigForm({});
                  toast.success('Step configured');
                }}>Save</Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Add Credential Dialog */}
      <DialogPrimitive.Root open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <DialogPrimitive.Title className="text-sm font-medium">Add credential</DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">✕</button>
              </DialogPrimitive.Close>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input value={credTitle} onChange={(e) => setCredTitle(e.target.value)} placeholder="My Gmail" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">Platform</label>
                <Input value={credPlatform} onChange={(e) => setCredPlatform(e.target.value)} placeholder="gmail | telegram | llm" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">Data (JSON)</label>
                <Input value={credData} onChange={(e) => setCredData(e.target.value)} placeholder='{"api_key":"..."}' />
              </div>
              <div className="pt-2">
                <Button className="w-full" disabled={creatingCred || !user?.id || !credTitle.trim() || !credPlatform.trim()} onClick={async () => {
                  if (!user?.id) { toast.error('Sign in required'); return; }
                  try {
                    setCreatingCred(true);
                    const parsed = credData ? JSON.parse(credData) : {};
                    await apiClient.post('/api/v1/credential/create', {
                      user_id: user.id,
                      title: credTitle.trim(),
                      platform: credPlatform.trim(),
                      data: parsed,
                    });
                    toast.success('Credential added');
                    setCredDialogOpen(false);
                    setCredTitle(''); setCredPlatform(''); setCredData('');
                    // refresh
                    const res = await apiClient.get('/api/v1/credential/all', { params: { user_id: user.id } });
                    const arr = Array.isArray(res.data) ? res.data : [];
                    setCredentials(arr.map((c: any) => ({ id: c.id, title: c.title, platform: c.platform })));
                  } catch (e: any) {
                    const msg = e?.response?.data?.detail || e?.message || 'Failed to add credential';
                    toast.error(String(msg));
                  } finally {
                    setCreatingCred(false);
                  }
                }}>{creatingCred ? 'Creating...' : 'Create credential'}</Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      {/* Save Workflow Dialog and handler */}
      <DialogPrimitive.Root open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <DialogPrimitive.Title className="text-sm font-medium">Save workflow</DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground">✕</button>
              </DialogPrimitive.Close>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="internal-name" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} placeholder="My workflow" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  aria-label="Toggle enabled"
                  className={`h-6 w-10 rounded-full border border-border ${saveEnabled ? 'bg-primary/80' : 'bg-muted'}`}
                  onClick={() => setSaveEnabled((v) => !v)}
                />
                <span className="text-muted-foreground">Enabled</span>
              </div>
              <div className="pt-2">
                <Button className="w-full" disabled={saving || !user?.id || !saveName.trim() || !saveTitle.trim()} onClick={async () => {
                  if (!user?.id) { toast.error('Sign in required'); return; }
                  try {
                    setSaving(true);
                    const payload = {
                      name: saveName.trim(),
                      title: saveTitle.trim(),
                      enabled: saveEnabled,
                      user_id: user.id,
                      nodes: nodes.filter((n) => n.id !== 'first-node').map((n: any) => ({
                        positionX: n.position?.x ?? 0,
                        positionY: n.position?.y ?? 0,
                        data: {
                          ...(n.data ?? {}),
                          // store selected credential id if any
                          credential_id: credentials[0]?.id,
                        },
                      })),
                      connections: [],
                    };
                    await apiClient.post('/api/v1/workflow/create', payload);
                    toast.success('Workflow saved');
                    setSaveDialogOpen(false);
                  } catch (e: any) {
                    const msg = e?.response?.data?.detail || e?.message || 'Failed to save workflow';
                    toast.error(String(msg));
                  } finally {
                    setSaving(false);
                  }
                }}>{saving ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
