import { Suspense } from "react";
import ExecutionView from "@/components/ExecutionView";

export const instant = false;

export default async function ExecutionPage({
  params,
}: {
  params: Promise<{ decisionId: string }>;
}) {
  const { decisionId } = await params;
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: 40 }}>Loading execution…</div>}>
      <ExecutionView decisionId={decisionId} />
    </Suspense>
  );
}
