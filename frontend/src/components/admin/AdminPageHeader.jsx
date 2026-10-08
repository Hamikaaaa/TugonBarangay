function AdminPageHeader({ eyebrow, title, description, children, footer }) {
  return (
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#123F70] via-[#2455D6] to-[#7138E8] p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1 xl:max-w-3xl">
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap">
            {children}
          </div>
        )}
      </div>
      {footer && (
        <div className="mt-5 border-t border-white/15 pt-4 text-xs font-medium text-white/75">
          {footer}
        </div>
      )}
    </header>
  );
}

export default AdminPageHeader;
