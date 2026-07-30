export function GoldenEvidenceScene() {
  return (
    <div className="evidence-scene" aria-label="لوحة شهادات تكشف تناقضًا">
      <div className="evidence-scene__masthead" aria-hidden="true">
        <strong>THE STATEMENT</strong>
        <span>ملف الجلسة 08 · آخر تحديث 11:48 PM</span>
        <b>SIX STORIES.<br />ONE LIE.</b>
      </div>

      <svg
        className="evidence-scene__threads"
        viewBox="0 0 725 670"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M503 280 C466 356 420 401 370 470 C310 553 191 540 105 500" />
        <path d="M464 293 C510 352 545 405 594 456" />
        <path d="M302 286 C260 338 205 382 172 442" />
        <circle cx="503" cy="280" r="5" />
        <circle cx="105" cy="500" r="5" />
        <circle cx="594" cy="456" r="5" />
        <circle cx="172" cy="442" r="5" />
      </svg>

      <article className="evidence-scene__shared">
        <span className="evidence-scene__time">11:45</span>
        <span className="evidence-scene__label">روايتنا المشتركة</span>
        <p>«كنا في المجلس<br />وقت انطفاء الأنوار.»</p>
        <small>تمت الموافقة عليها من ٦ لاعبين.</small>
      </article>

      <article className="evidence-scene__note">
        الحارس قال إنه سمع صوت زجاج بعد انطفاء الأنوار.
      </article>

      <figure className="evidence-scene__photo">
        <div aria-hidden="true">
          <span />
        </div>
        <figcaption>الحارس · 11:48</figcaption>
      </figure>

      <article className="evidence-scene__testimony evidence-scene__testimony--left">
        <div><span>11:46</span><span>إجابة راكان</span></div>
        <p>«كنت عند الباب لما<br />سمعت صوت الزجاج.»</p>
        <small>المكان: المدخل · الشاهد: سعود</small>
      </article>

      <article className="evidence-scene__testimony evidence-scene__testimony--right">
        <div><span>11:46</span><span>إجابة سعود</span></div>
        <p>«كنت لحالي في المواقف.<br />راكان ما كان معي.»</p>
        <small>المكان: المواقف · بدون شاهد</small>
      </article>

      <p className="evidence-scene__caption">
        حرّك المؤشر — الشهادات تتحرك بطبقات مختلفة
      </p>
    </div>
  );
}
