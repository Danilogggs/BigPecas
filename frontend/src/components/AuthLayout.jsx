export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="container auth-wrapper d-flex align-items-center justify-content-center py-5">
      <div className="row justify-content-center w-100">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="auth-card p-4 p-md-5">
            <span className="brand-badge mb-3">BigPeças</span>
            <h1 className="h2 fw-bold mb-2">{title}</h1>
            <p className="text-secondary mb-4">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
