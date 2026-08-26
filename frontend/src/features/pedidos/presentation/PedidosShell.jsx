import Header from '../../../components/Header';

export default function PedidosShell({ children }) {
  return (
    <div className="history-page">
      <Header />
      <main className="history-container">{children}</main>
    </div>
  );
}
