import type {
  WarehouseCaseDefinition,
  WarehouseIssueType,
  WarehousePublicView,
} from "@al-riwayah/game-engine";

export function WarehouseResult({
  pub,
  warehouseCase,
  isHost,
  busy,
  run,
  replay,
  goToNewGroup,
}: {
  pub: WarehousePublicView;
  warehouseCase: WarehouseCaseDefinition;
  isHost: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  replay: () => Promise<unknown>;
  goToNewGroup: () => Promise<void>;
}) {
  const result = pub.result;
  if (!result || result.status === "incomplete") {
    return <WarehouseFairScoreFailure message={warehouseCase.copy.fairScoreUnavailable.ar} />;
  }
  const band =
    warehouseCase.resultBands.find(
      (item) => result.overall >= item.min && result.overall <= item.max,
    ) ?? warehouseCase.resultBands[0]!;
  const patches = pub.resultNarrative.filter((item) => item.type === "patch");
  const laterEffects = pub.resultNarrative.filter((item) => item.type === "later_effect");
  const { worstContradiction, bestPatch } = pub.resultAttribution;
  const entryReason =
    warehouseCase.storyOptions.entryReasons.find(
      (option) => option.id === pub.sharedStory.entryReason,
    )?.label.ar ?? pub.sharedStory.entryReason;
  const entryRoute =
    warehouseCase.storyOptions.entryRoutes.find(
      (option) => option.id === pub.sharedStory.entryRoute,
    )?.label.ar ?? pub.sharedStory.entryRoute;
  const keyHolder =
    pub.players.find((player) => player.id === pub.sharedStory.keyHolderInitial)?.name ??
    pub.sharedStory.keyHolderInitial;
  const issues =
    pub.issueHistory.length > 0
      ? pub.issueHistory.map((issue) => ({
          refId: issue.id,
          type: issue.type,
          label: issue.explanation,
        }))
      : pub.resultNarrative
          .filter((item) => item.type === "issue")
          .map((item) => ({ ...item, type: null }));
  return (
    <>
      <section className="gm-verdict-panel">
        <div className="gm-verdict-copy">
          <span>الحكم الجماعي</span>
          <h1>
            روايتكم
            <br />
            <em>{band.label.ar}</em>
          </h1>
        </div>
        <div className="gm-score-orbit" aria-label={`النتيجة ${result.overall} من 100`}>
          <strong className="verdict-band">{result.overall}</strong>
          <span>من 100</span>
        </div>
      </section>
      <section className="gm-metrics" aria-label="مقاييس النتيجة">
        <MetricCard label="الاتساق" value={result.consistency} />
        <MetricCard label="المعقولية" value={result.plausibility} />
        <MetricCard label="الثبات" value={result.stability} />
      </section>
      <div className="result-story" aria-label="سرد النتيجة الجماعية">
        <div className="gm-recap" data-testid="warehouse-initial-story-result">
          <header>
            <span>الرواية الأولى</span>
          </header>
          <p>
            دخلتم بسبب «{entryReason}» من «{entryRoute}»، وكان المفتاح مع {keyHolder}.
          </p>
        </div>
        {worstContradiction ? (
          <div className="gm-recap gm-recap--danger" data-testid="warehouse-worst-attribution">
            <header>
              <span>أسوأ تناقض — {worstContradiction.playerName}</span>
              <b>أكثر واحد لخبط الرواية</b>
            </header>
            <p>
              {worstContradiction.playerName} اختار «{worstContradiction.answer.ar}»، بينما الحقيقة
              المرتبطة قالت «{worstContradiction.conflict.ar}».
            </p>
            <small>{worstContradiction.explanation.ar}</small>
          </div>
        ) : (
          <div className="gm-recap gm-recap--success" data-testid="warehouse-no-direct-result">
            <header>
              <span>ما أحد لخبطها</span>
            </header>
            <p>روايتكم بقيت متماسكة.</p>
          </div>
        )}
        {bestPatch ? (
          <div className="gm-recap gm-recap--success" data-testid="warehouse-best-attribution">
            <header>
              <span>أفضل ترقيعة — {bestPatch.playerName}</span>
            </header>
            <p>{bestPatch.contribution.ar}</p>
            <small>{bestPatch.impact.ar}</small>
          </div>
        ) : (
          <div className="gm-recap gm-recap--success" data-testid="warehouse-no-patch-result">
            <header>
              <span>ما احتجتم ترقيعة</span>
            </header>
            <p>إجاباتكم فسرت الأدلة من البداية.</p>
          </div>
        )}
        {issues.map((item) => (
          <div key={item.refId} className="gm-recap gm-recap--danger">
            <header>
              <span>ضغط على الرواية</span>
            </header>
            <p>{item.label.ar}</p>
          </div>
        ))}
        {patches.map((item) => (
          <div key={item.refId} className="gm-recap gm-recap--success">
            <header>
              <span>قرار جماعي</span>
            </header>
            <p>{item.label.ar}</p>
          </div>
        ))}
        {laterEffects.map((item) => (
          <div key={item.refId} className="gm-recap" data-testid="warehouse-later-effect-result">
            <header>
              <span>أثر القرار في الفصل التالي</span>
            </header>
            <p>{item.label.ar}</p>
          </div>
        ))}
        <div className="gm-recap">
          <span className="eyebrow">سبب الدرجة</span>
          <p>{band.summary.ar}</p>
        </div>
      </div>
      {isHost && (
        <div className="game__actions">
          <button className="btn btn--evidence" disabled={busy} onClick={() => run(replay)}>
            أعيدوا القضية
          </button>
          <button className="btn btn--ghost" disabled={busy} onClick={goToNewGroup}>
            مجموعة جديدة
          </button>
        </div>
      )}
    </>
  );
}

export function WarehouseFairScoreFailure({ message }: { message: string }) {
  return (
    <section className="phase-proof phase-proof--pending" data-testid="warehouse-fair-score-failure">
      <span className="phase-proof__index mono">نتيجة غير عادلة</span>
      <h1 className="game__prompt">{message}</h1>
      <p>نحتاج بيانات كاملة من الفصول قبل إصدار حكم جماعي.</p>
    </section>
  );
}

export function WarehouseIssueCards({
  issues,
}: {
  issues: WarehousePublicView["revealedIssues"];
}) {
  if (issues.length === 0) {
    return (
      <section className="phase-proof phase-proof--clear" data-testid="warehouse-no-direct-issue">
        <span className="phase-proof__index mono">فحص</span>
        <h1 className="game__prompt">ما ظهر تناقض مباشر.</h1>
        <p>الضغط الحالي في تفسير الأدلة والفجوات، وليس في اتهام لاعب.</p>
      </section>
    );
  }
  return (
    <div className="warehouse-issue-list">
      {issues.map((issue) => (
        <article key={issue.id} className="gm-recap gm-recap--danger" data-issue-type={issue.type}>
          <header>
            <span>{issueCopy(issue.type)}</span>
            <b>{issue.title.ar}</b>
          </header>
          <p>{issue.explanation.ar}</p>
          {issue.statementA && <small>{issue.statementA.ar}</small>}
          {issue.statementB && <small>{issue.statementB.ar}</small>}
          {issue.rule && <small>{issue.rule.ar}</small>}
        </article>
      ))}
    </div>
  );
}

function issueCopy(type: WarehouseIssueType): string {
  const map: Record<WarehouseIssueType, string> = {
    DIRECT_CONTRADICTION: "إجابتان لا تركبان معًا",
    EVIDENCE_CONFLICT: "الرواية تصطدم بالدليل",
    STORY_GAP: "تفصيلة لازمة لم تُحسم",
    UNEXPLAINED_EVIDENCE: "دليل بلا تفسير",
  };
  return map[type];
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="gm-metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
