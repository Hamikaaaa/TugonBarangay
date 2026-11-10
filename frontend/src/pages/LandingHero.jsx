import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Menu, Shield, X } from "lucide-react";
import Login from "./Login";
import Register from "./Register";

export default function LandingHero() {
  const [params, setParams] = useSearchParams();
  const [modal, setModal] = useState(params.get("auth") === "signup" ? "signup" : params.get("auth") === "login" ? "login" : "");
  const [menuOpen, setMenuOpen] = useState(false);
  const closeModal = useCallback(() => { setModal(""); setParams({}, { replace: true }); }, [setParams]);

  useEffect(() => {
    const auth = params.get("auth");
    setModal(auth === "login" || auth === "signup" ? auth : "");
  }, [params]);

  useEffect(() => {
    if (!modal) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => { if (event.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [modal, closeModal]);

  const openModal = (name) => { setModal(name); setParams({ auth: name }, { replace: true }); setMenuOpen(false); };

  return <div className="min-h-screen bg-white">
    <section id="home" className="relative flex min-h-screen flex-col overflow-hidden bg-[#123f70] text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/consolacion-municipal-hall.jpg')", backgroundPosition: "center 48%" }} />
      <div className="absolute inset-0 bg-[#07366b]/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b376b]/65 via-[#0c3c70]/35 to-[#0b315e]/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#071f43]/30 via-transparent to-[#092b54]/60" />

      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-5 px-6 py-7 sm:px-10 lg:px-16 lg:py-9">
        <a href="#home" className="flex shrink-0 items-center gap-3" aria-label="TugonBarangay home">
          <img src="/images/logo-white-version.png" alt="" className="h-10 w-10 object-contain sm:h-14 sm:w-14" />
          <span><strong className="block text-base font-extrabold tracking-tight sm:text-xl">Tugon<span className="text-[#F87171]">Barangay</span></strong><small className="hidden text-[10px] font-semibold uppercase tracking-[.22em] text-blue-100/85 sm:block">Barangay Citizen Portal</small></span>
        </a>

        <nav className={`${menuOpen ? "absolute left-4 right-4 top-full flex flex-col items-stretch gap-1 rounded-2xl border border-white/15 bg-[#0b315f]/95 p-3 shadow-2xl backdrop-blur-lg" : "hidden"} z-20 lg:static lg:flex lg:flex-row lg:items-center lg:gap-7 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          <a href="#home" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white">Home</a>
          <a href="#services" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white">Services</a>
          <a href="#about" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white">About</a>
          <button onClick={() => openModal("login")} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/95 transition hover:bg-white/10">Login</button>
          <button onClick={() => openModal("signup")} className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#123f70] shadow transition hover:bg-blue-50">Get Started</button>
        </nav>

        <img src="/images/TayudLogo.png" alt="Barangay Tayud seal" className="ml-auto h-9 w-9 shrink-0 rounded-full object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,.45)] sm:h-[68px] sm:w-[68px] lg:ml-2 lg:h-[82px] lg:w-[82px]" />
        <button aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-white/20 bg-white/10 p-2 text-white lg:hidden">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </header>

      <main className="relative z-[1] mx-auto flex w-full max-w-[1440px] flex-1 items-end px-6 pb-[9vh] pt-24 sm:px-10 lg:px-16">
        <div className="max-w-[790px] animate-[fade-in_.7s_ease-out_both]">
          <p className="mb-4 text-lg font-semibold tracking-wide text-blue-100 sm:text-xl">Welcome, Tayuranon!</p>
          <h1 className="text-[clamp(2.65rem,6.2vw,5.5rem)] font-extrabold leading-[1.04] tracking-[-.035em] text-white">Your Digital Gateway to <span className="block text-[#F87171]">Barangay Tayud Services</span></h1>
          <p className="mt-5 max-w-[660px] text-base leading-7 text-blue-50/90 sm:mt-6 sm:text-lg sm:leading-8">Sign in to request barangay documents, track your requests, manage your profile, and file complaints online.</p>
          <p className="mt-12 flex items-center gap-3 text-xs font-medium text-blue-100/75 sm:mt-16 sm:text-sm"><Shield size={18} strokeWidth={1.6} /> Secured by the BSIT 4B Group 4 Students</p>
        </div>
      </main>
    </section>

    <section id="services" className="scroll-mt-8 bg-white px-6 py-16 sm:px-10 lg:px-16"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-800">Barangay services</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Services, closer to home.</h2><p className="mt-3 max-w-2xl text-slate-600">Request barangay documents, follow your requests, and reach the services you need through TugonBarangay.</p><div className="mt-7 flex flex-wrap gap-3">{["Barangay Clearance", "Certificate of Residency", "Business Clearance", "Good Moral Character", "First-Time Jobseeker"].map((service) => <span key={service} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{service}</span>)}</div></div></section>
    <section id="about" className="scroll-mt-8 bg-slate-50 px-6 py-14 sm:px-10 lg:px-16"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-800">About TugonBarangay</p><p className="mt-3 max-w-3xl leading-7 text-slate-600">A chatbot-enabled barangay service system for online document requests and complaint management, built to make local services more accessible and convenient for Barangay Tayud residents.</p></div></section>

    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#061a35]/75 p-3 backdrop-blur-md sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div role="dialog" aria-modal="true" aria-label={modal === "login" ? "Log in" : "Create account"} className="auth-modal-enter relative my-auto max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-[0_30px_100px_rgba(0,0,0,.4)] sm:rounded-3xl">
        <button type="button" aria-label="Close dialog" onClick={closeModal} className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:bg-slate-100"><X size={18}/></button>
        {modal === "login" ? <Login isModal /> : <Register isModal />}
      </div>
    </div>}
  </div>;
}
