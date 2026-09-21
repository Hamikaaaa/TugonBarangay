function AdminWorkspacePlaceholder({ title, description }) {
  return (
    <section className="pt-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_8px_25px_rgba(18,49,82,0.05)] sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF1FF] text-lg font-bold text-[#2455D6]">
          ▣
        </div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">
          Admin Workspace
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#172B4D]">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          {description ||
            "This workspace is ready for barangay records, service workflows, and administrative data."}
        </p>
      </div>
    </section>
  );
}

export default AdminWorkspacePlaceholder;
