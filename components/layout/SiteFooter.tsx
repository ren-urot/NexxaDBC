export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 py-10 text-center sm:px-10">
        <p className="text-sm text-ink-soft">© {new Date().getFullYear()} Nexxa DBC. All rights reserved.</p>
      </div>
    </footer>
  );
}
