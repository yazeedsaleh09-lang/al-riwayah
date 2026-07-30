export default function Loading() {
  return (
    <main id="main" className="simple-page simple-state-shell" aria-live="polite" aria-busy="true">
      <section className="simple-card simple-state-card">
        <span className="simple-loader" aria-hidden="true" />
        <p className="simple-label">لحظة واحدة</p>
        <h1>نرتّب الملف…</h1>
      </section>
    </main>
  );
}
