import ReactFlowComponent from "@/components/workflow/react-flow";

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const idNum = Number(resolvedParams?.id);
  const workflowId = Number.isNaN(idNum) ? undefined : idNum;
  return (
    <div className="flex flex-col">
      <ReactFlowComponent workflowId={workflowId} />
    </div>
  )
}
