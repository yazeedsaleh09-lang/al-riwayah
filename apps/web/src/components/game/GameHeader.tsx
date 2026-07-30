import { DeadlineRing } from "./DeadlineRing";

type GameHeaderProps = {
  variant: "lobby" | "question" | "result";
  connected: boolean;
  caseTitle?: string;
  questionNumber?: number;
  deadlineAt?: number | null;
  serverTime?: number;
};

export function GameHeader({
  variant,
  connected,
  caseTitle,
  questionNumber = 1,
  deadlineAt = null,
  serverTime = 0,
}: GameHeaderProps) {
  if (variant === "question") {
    return (
      <header className="gm-game-header gm-game-header--question">
        <div className="gm-question-meta">
          <strong>السؤال {questionNumber} من ٥</strong>
          <span>{caseTitle}</span>
        </div>
        <div className="gm-question-private">
          <span><i aria-hidden /> إجابتك سرية</span>
          <DeadlineRing deadlineAt={deadlineAt} serverTime={serverTime} />
        </div>
      </header>
    );
  }

  return (
    <header className={`gm-game-header gm-game-header--${variant}`}>
      <div className="gm-game-brand">
        <span className="gm-game-brand__mark" aria-hidden>
          {variant === "result" ? "ر" : <i />}
        </span>
        <strong>الرواية</strong>
      </div>
      <span className="gm-game-status">
        <i aria-hidden />
        {variant === "result" ? "انتهى التحقيق" : connected ? "متصل" : "يعيد الاتصال"}
      </span>
    </header>
  );
}
