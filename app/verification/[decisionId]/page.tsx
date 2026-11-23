import { Suspense } from "react";
import VerificationView from "@/components/VerificationView";

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ decisionId: string }>;
}) {
  const { decisionId } = await params;
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: 40 }}>Loading verification…</div>}>
      <VerificationView decisionId={decisionId} />
    </Suspense>
  );
}
