import { notFound } from "next/navigation";
import { warehouseCaseV1 } from "@al-riwayah/content";
import type { WarehousePublicView } from "@al-riwayah/game-engine";
import {
  WarehouseFairScoreFailure,
  WarehouseIssueCards,
} from "@/components/game/WarehouseEvidence";

export default function WarehouseEvidencePage() {
  if (process.env.E2E_DEV !== "1") notFound();

  const issueTypes = new Set<string>();
  const issues = warehouseCaseV1.issues
    .filter((issue) => {
      if (issueTypes.has(issue.type)) return false;
      issueTypes.add(issue.type);
      return true;
    })
    .map((issue) => ({
      id: issue.id,
      type: issue.type,
      title: issue.publicTitle,
      explanation: issue.publicExplanation,
      ...(issue.statementA ? { statementA: issue.statementA } : {}),
      ...(issue.statementB ? { statementB: issue.statementB } : {}),
      ...(issue.rule ? { rule: issue.rule } : {}),
    })) satisfies WarehousePublicView["revealedIssues"];

  return (
    <main className="game gm-result" id="main" data-testid="warehouse-test-evidence">
      <section className="game__body">
        <span className="stamp">دليل حالات الاختبار</span>
        <h1 className="game__prompt">أنواع ضغط الرواية الأربعة</h1>
        <WarehouseIssueCards issues={issues} />
        <WarehouseFairScoreFailure message={warehouseCaseV1.copy.fairScoreUnavailable.ar} />
      </section>
    </main>
  );
}
