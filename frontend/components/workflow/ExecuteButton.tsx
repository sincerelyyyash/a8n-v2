"use client"

import * as React from 'react';
import { useState } from 'react';
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';

type ExecutionStatus = 'idle' | 'executing' | 'success' | 'error';

const extractErrorMessage = (error: any): string => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === 'string') return first;
    if (first?.msg) return String(first.msg);
    return JSON.stringify(first);
  }
  if (typeof detail === 'string') return detail;
  return error?.message || 'Failed to execute workflow';
};

interface ExecuteButtonProps {
  workflowId?: number;
  disabled?: boolean;
  className?: string;
  onExecutionStart?: () => void;
  onExecutionComplete?: () => void;
  onNodeStatusUpdate?: (nodeId: string, status: 'idle' | 'executing' | 'success' | 'error', result?: any, error?: string) => void;
}

export const ExecuteButton: React.FC<ExecuteButtonProps> = ({ 
  workflowId, 
  disabled = false,
  className = "",
  onExecutionStart,
  onExecutionComplete,
  onNodeStatusUpdate
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [executionId, setExecutionId] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!workflowId || !user?.id) {
      toast.error('Workflow ID and user authentication required');
      return;
    }

    try {
      setStatus('executing');
      setExecutionId(null);
      onExecutionStart?.();

      const response = await apiClient.post('/api/v1/execution/workflow', {
        workflow_id: workflowId,
        execution_type: 'workflow'
      });

      const { execution_id } = response.data;
      setExecutionId(execution_id);
      
      toast.success('Workflow execution started');
      
      // Start polling for status updates
      pollExecutionStatus(execution_id);
      
    } catch (error: any) {
      console.error('Execution error:', error);
      setStatus('error');
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
      
      // Reset status after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const pollExecutionStatus = async (execId: string) => {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        // Poll workflow execution status
        const response = await apiClient.get(`/api/v1/execution/status/${execId}`);
        const { status: execStatus } = response.data;

        if (execStatus === 'completed') {
          setStatus('success');
          onExecutionComplete?.();
          toast.success('Workflow executed successfully');
          setTimeout(() => setStatus('idle'), 3000);
          return;
        } else if (execStatus === 'failed') {
          setStatus('error');
          onExecutionComplete?.();
          toast.error('Workflow execution failed');
          setTimeout(() => setStatus('idle'), 3000);
          return;
        } else if (execStatus === 'running' || execStatus === 'queued') {
          // Poll individual node executions
          await pollNodeExecutions();
          
          // Continue polling
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setStatus('error');
            toast.error('Workflow execution timed out');
            setTimeout(() => setStatus('idle'), 3000);
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
        setStatus('error');
        toast.error('Failed to check execution status');
        setTimeout(() => setStatus('idle'), 3000);
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
  };

  const pollNodeExecutions = async () => {
    try {
      if (!workflowId || !user?.id) return;
      
      // Get recent executions for this workflow
      const response = await apiClient.get(`/api/v1/execution/list?workflow_id=${workflowId}&limit=10`);
      const executions = response.data?.data || [];
      
      // Update node statuses based on execution results
      executions.forEach((exec: any) => {
        if (exec.node_id && onNodeStatusUpdate) {
          let nodeStatus: 'idle' | 'executing' | 'success' | 'error' = 'idle';
          
          switch (exec.status) {
            case 'queued':
            case 'running':
              nodeStatus = 'executing';
              break;
            case 'completed':
              nodeStatus = 'success';
              break;
            case 'failed':
              nodeStatus = 'error';
              break;
          }
          
          onNodeStatusUpdate(String(exec.node_id), nodeStatus, exec.result, exec.error);
        }
      });
    } catch (error) {
      console.error('Node execution polling error:', error);
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'executing':
        return (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Executing...</span>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="size-4 text-green-500" />
            <span>Success</span>
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="size-4 text-red-500" />
            <span>Failed</span>
          </>
        );
      default:
        return (
          <>
            <Play className="size-4" />
            <span>Execute Workflow</span>
          </>
        );
    }
  };

  const isDisabled = disabled || !workflowId || !user?.id || status === 'executing';

  return (
    <Button
      onClick={handleExecute}
      disabled={isDisabled}
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[200] shadow-lg ${className}`}
      size="lg"
    >
      {getButtonContent()}
    </Button>
  );
};

export default ExecuteButton;
