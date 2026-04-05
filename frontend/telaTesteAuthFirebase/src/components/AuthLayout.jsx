import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, badge = 'BigPeças', children }) {
  return (
    <div className="min-h-screen bg-[#FAF6EF] flex flex-col">
      <header className="bg-[#6B1E2D] px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.35em] text-[#C2A878] m-0">Retro Garage</p>
          <Link to="/" className="no-underline">
            <span className="font-serif text-2xl font-bold text-[#F4E9D8]">BigPeças</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[28px] border border-[#D8CFC2] shadow-xl p-8">
            <div className="mb-6">
              <span className="inline-block rounded-full bg-[#C2A878]/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#7C6540] mb-4">
                {badge}
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#2C1A17] m-0">{title}</h2>
              {subtitle && (
                <p className="text-sm text-[#6A5F58] mt-1 mb-0">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
