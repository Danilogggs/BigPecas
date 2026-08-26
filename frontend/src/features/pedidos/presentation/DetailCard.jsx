export default function DetailCard({ title, children }) {
  return (
    <section className="detail-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
