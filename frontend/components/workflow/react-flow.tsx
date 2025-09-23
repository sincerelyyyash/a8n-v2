"use client"
import { useState, useCallback, useMemo } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, useReactFlow, Edge, type NodeTypes, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CreateFirstNode } from './nodes/FirstNode';
import { MediaTitleNode } from './nodes/MediaTitleNode';
import ActionToolbar from './ActionToolbar';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { useSidebar } from "@/components/ui/sidebar";

const nodeTypes: NodeTypes = {
  firstNode: CreateFirstNode,
  mediaTitle: MediaTitleNode as unknown as React.ComponentType<NodeProps>,
};

const initialNodes = [
  {
    id: 'first-node',
    type: 'firstNode',
    position: { x: 0, y: 0 },
    data: { label: 'Add First Step' },
  },
];

const initialEdges: Edge[] = [];

export default function ReactFlowComponent() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [toolbarOpen, setToolbarOpen] = useState(false);

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
    const hasNonFirstNodes = nodes.some((n) => n.id !== 'first-node');
    if (hasNonFirstNodes) {
      return nodes.filter((n) => n.id !== 'first-node');
    }
    // Ensure the first node is available when empty
    return nodes.length ? nodes : initialNodes;
  }, [nodes]);

  return (
    <div className="w-full h-[calc(100vh-4.5rem)] bg-sidebar px-2 pb-0 pt-0">
      <div className="w-full h-full bg-sidebar/90 rounded-lg border border-sidebar-border p-2">
        <ReactFlow
          className="bg-sidebar/95 rounded-lg"
        nodes={computedNodes.map((n) => {
          if (n.id === 'first-node') {
            return { ...n, data: { ...n.data, onClick: () => setToolbarOpen(true) } };
          }
          if (n.type === 'mediaTitle') {
            return { ...n, data: { ...n.data, onClick: () => setToolbarOpen(true) } };
          }
          return n;
        })}
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
      <ActionToolbar open={toolbarOpen} onOpenChange={setToolbarOpen} />
    </div>
  );
}
