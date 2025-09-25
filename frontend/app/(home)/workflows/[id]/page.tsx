import ReactFlowComponent from "@/components/workflow/react-flow";
import WorkflowPageAppbar from "@/components/workflow/WorkflowPageAppbar";

export default function WorkflowPage({ params }: { params: { id: string } }) {
  const idNum = Number(params?.id);
  const workflowId = Number.isNaN(idNum) ? undefined : idNum;
  return (
    <div className="flex flex-col">
      <ReactFlowComponent workflowId={workflowId} />
    </div>
  )
}
