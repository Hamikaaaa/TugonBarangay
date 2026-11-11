import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Award, BadgeCheck, Bell, Bot, BriefcaseBusiness, Building2, Check, ChevronRight, Clock3, FileText, Menu, MessageCircle, Search, ShieldCheck, UserRound, X, ClipboardCheck, Send, PackageCheck } from "lucide-react";
import Login from "./Login";
import Register from "./Register";
import { useAuth } from "../context/AuthContext";

const popularServices = [
  { title: "Barangay Clearance", description: "For employment, local transactions, and other official purposes.", Icon: FileText },
  { title: "Certificate of Residency", description: "Certify your current residency in Barangay Tayud.", Icon: Building2 },
  { title: "Business Clearance", description: "Apply for barangay clearance for your local business.", Icon: BriefcaseBusiness },
  { title: "Certificate of Good Moral Character", description: "Request a barangay character certification.", Icon: Award },
  { title: "First-Time Jobseeker Certification", description: "Get a certification for your first-time job search.", Icon: BadgeCheck },
  { title: "Online Complaint Management", description: "Submit a concern and follow updates from barangay personnel.", Icon: MessageCircle },
];

const featureItems = [
  ["Online Document Requests", "Apply for available barangay documents from your resident account.", FileText],
  ["Complaint Management", "Send concerns with supporting details and follow their progress.", MessageCircle],
  ["BantayBot Chatbot", "Get help with service information, requirements, and common questions.", Bot],
  ["Request Tracking", "Review request status and history in one convenient place.", Clock3],
  ["Notifications", "Receive updates when barangay personnel take action.", Bell],
  ["Resident Account Management", "Keep your account details and service activity together.", UserRound],
];

const journeySteps = [
  ["Register Account", "Create your resident account.", UserRound],
  ["Submit Request", "Choose a document or service.", Send],
  ["Staff Processing", "Barangay personnel review your submission.", ClipboardCheck],
  ["Track Progress", "Follow status updates in your account.", Clock3],
  ["Receive Document", "Get notified when it is ready.", PackageCheck],
];

export default function ServiceLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [modal, setModal] = useState(() => params.get("auth") === "signup" ? "signup" : params.get("auth") === "login" ? "login" : "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [greetingOpen, setGreetingOpen] = useState(true);
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

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    const elements = document.querySelectorAll("#popular-services, #journey, #trust, #features, #about, #contact");
    elements.forEach((element) => element.classList.add("reveal-on-scroll"));
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const openModal = (name) => { setModal(name); setParams({ auth: name }, { replace: true }); setMenuOpen(false); };
  const scrollTo = (id) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
  const searchServices = (event) => { event.preventDefault(); scrollTo("popular-services"); };
  const startService = (view = "documents") => {
    const selectedView = typeof view === "string" ? view : (() => {
      const label = view.currentTarget?.textContent?.toLowerCase() || "";
      return label.includes("complaint") ? "complaints" : label.includes("bot") ? "bantaybot" : "documents";
    })();
    if (!user) return openModal("login");
    if (user.role === "resident") return navigate(`/resident/dashboard?view=${selectedView}`);
    navigate(({ staff: "/staff/dashboard", admin: "/admin/dashboard" })[user.role] || "/unauthorized");
  };
  const visibleServices = popularServices.filter(({ title }) => title.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="min-h-screen bg-white text-slate-900">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,35,70,.04)]">
      <div className="mx-auto grid min-h-[72px] max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <a href="#home" className="flex min-w-0 items-center gap-2.5" aria-label="TugonBarangay home">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50"><img src="/images/logo-blue-version.png" alt="" className="h-8 w-8 object-contain" /></span>
          <span className="min-w-0"><strong className="block whitespace-nowrap text-[17px] font-extrabold tracking-tight text-slate-900 sm:text-lg">Tugon<span className="text-[#F87171]">Barangay</span></strong><small className="block whitespace-nowrap text-[9px] font-semibold uppercase tracking-[.12em] text-slate-500 sm:text-[10px]">Barangay Citizen Portal</small></span>
          <img src="/images/TayudLogo.png" alt="Barangay Tayud seal" className="ml-1 hidden h-10 w-10 shrink-0 object-contain xl:block" />
        </a>

        <nav className={`${menuOpen ? "absolute left-3 right-3 top-[68px] flex flex-col items-stretch gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xl" : "hidden"} z-20 lg:static lg:flex lg:flex-row lg:items-center lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none xl:gap-2`}>
          {[["Home", "home"], ["Services", "popular-services"], ["About", "about"], ["Contact", "contact"]].map(([label, id]) => <button key={id} onClick={() => scrollTo(id)} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-800">{label}</button>)}
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3"><img src="/images/TayudLogo.png" alt="Barangay Tayud seal" className="h-9 w-9 shrink-0 object-contain xl:hidden" /><button onClick={() => openModal("login")} className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 lg:inline-flex">Login</button><button onClick={() => openModal("signup")} className="hidden items-center gap-1.5 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 lg:inline-flex">Sign Up <ArrowRight size={15}/></button><button aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden">{menuOpen ? <X size={19}/> : <Menu size={19}/>}</button></div>
      </div>
      <div className="flex justify-center gap-2 border-t border-slate-100 px-3 py-2 lg:hidden"><button onClick={() => openModal("login")} className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-900">Login</button><button onClick={() => openModal("signup")} className="flex-1 rounded-lg bg-blue-800 px-3 py-2 text-sm font-semibold text-white">Sign Up</button></div>
    </header>

    <main>
      <section id="home" className="coastal-hero relative scroll-mt-20 overflow-hidden bg-[#0B3F91] text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/consolacion-municipal-hall.jpg')", backgroundPosition: "center 48%" }} />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(105deg,rgba(5,31,77,.88),rgba(11,63,145,.82)_56%,rgba(9,65,139,.78))]" />
        <div aria-hidden="true" className="coastal-wave coastal-wave-one" />
        <div aria-hidden="true" className="coastal-wave coastal-wave-two" />
        <div className="relative z-[1] mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:px-10 lg:py-[68px]">
          <div><p className="text-sm font-semibold text-blue-100 sm:text-base">Welcome to TugonBarangay</p><h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl">Your Digital Gateway to <span className="text-[#F87171]">Barangay Tayud Services</span></h1><p className="mt-5 max-w-xl text-base leading-7 text-blue-100 sm:text-[17px]">Access barangay services, request documents online, track your requests, manage your profile, and submit complaints conveniently through TugonBarangay.</p><div className="mt-7 flex flex-wrap gap-3"><button onClick={() => scrollTo("popular-services")} className="flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-blue-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50">Browse Services <ArrowRight size={16}/></button><button onClick={() => scrollTo("contact")} className="rounded-lg border border-white/75 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Contact Us</button></div></div>

          <div className="service-finder rounded-2xl bg-white p-5 text-slate-900 shadow-[0_18px_50px_rgba(2,20,60,.22)] transition duration-300 sm:p-6 lg:p-7">
            <div className="flex items-center gap-2 text-sm font-bold"><Search size={18} className="text-blue-800"/> Find a Barangay Service</div>
            <form onSubmit={searchServices} className="mt-4 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="e.g., Barangay Clearance, Certificate of Residency" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/><button aria-label="Search services" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-800 text-white transition hover:bg-blue-900"><ArrowRight size={19}/></button></form>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 text-[11px] font-medium text-slate-500">Popular:</span>{[["Barangay Clearance", FileText], ["Certificate of Residency", Building2], ["Business Clearance", BriefcaseBusiness]].map(([name, Icon]) => <button key={name} onClick={() => { setQuery(name); scrollTo("popular-services"); }} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-blue-900 transition hover:bg-blue-100"><Icon size={13}/>{name}</button>)}</div>
          </div>
        </div>
      </section>

      <section id="popular-services" className="scroll-mt-20 px-5 py-12 sm:px-8 sm:py-14 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-6"><h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Popular Barangay Services</h2><p className="mt-2 text-sm text-slate-500">Quick access to frequently requested barangay services</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleServices.map(({ title, description, Icon }) => <button key={title} onClick={startService} className="group flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0_1px_3px_rgba(15,23,42,.04)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-800 transition group-hover:bg-blue-100"><Icon size={20}/></span><span className="min-w-0"><strong className="block text-sm font-bold leading-5 text-slate-900">{title}</strong><small className="mt-1 block text-xs leading-4 text-slate-500">{description}</small></span><ChevronRight size={16} className="ml-auto shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-700"/></button>)}<button onClick={() => { setQuery(""); scrollTo("popular-services"); }} className="flex min-h-[112px] items-center gap-4 rounded-xl bg-blue-800 p-4 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-900"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/15"><ArrowRight size={20}/></span><span><strong className="block text-sm font-bold">View All Services</strong><small className="mt-1 block text-xs text-blue-100">Browse the TugonBarangay service directory</small></span><ChevronRight size={16} className="ml-auto"/></button></div>{visibleServices.length === 0 && <p className="mt-6 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No matching service. Try another search.</p>}</div></section>

      <section id="journey" className="scroll-mt-20 border-y border-slate-100 bg-white px-5 py-12 sm:px-8 sm:py-14 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-800">Resident service journey</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px]">From request to ready.</h2></div><div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-5"><div aria-hidden="true" className="absolute left-[9%] right-[9%] top-6 hidden border-t-2 border-dashed border-blue-100 lg:block"/>{journeySteps.map(([title, description, Icon], index) => <article key={title} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><div className="flex items-center gap-3"><span className="journey-icon relative z-[1] grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-800"><Icon size={20}/></span><span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Step 0{index + 1}</span></div><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></article>)}</div></div></section>

      <section id="trust" className="scroll-mt-20 bg-blue-50/70 px-5 py-12 sm:px-8 sm:py-14 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-7 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-800 shadow-sm"><ShieldCheck size={22}/></span><span><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-800">Trust &amp; security</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Services you can follow with confidence.</h2></span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Secure Resident Accounts", "Transparent Request Tracking", "Organized Complaint Management", "Accessible Digital Services"].map((label) => <div key={label} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check size={16}/></span><span className="text-sm font-semibold text-slate-700">{label}</span></div>)}</div></div></section>

      <section id="features" className="scroll-mt-20 bg-slate-50 px-5 py-12 sm:px-8 sm:py-14 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-800">One resident portal</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px]">Barangay services, made more accessible.</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featureItems.map(([title, description, Icon]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-800"><Icon size={19}/></span><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p></article>)}</div></div></section>

      <section id="about" className="scroll-mt-20 px-5 py-14 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_.8fr] md:items-center"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-800">About the system</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px]">About TugonBarangay</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">TugonBarangay is a chatbot-enabled barangay service system designed to make barangay services more accessible, convenient, and efficient for residents of Barangay Tayud, Consolacion, Cebu.</p><button onClick={() => scrollTo("features")} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-800 transition hover:text-blue-950">Learn More <ArrowRight size={16}/></button></div><div className="rounded-xl border border-blue-100 bg-blue-50 p-5"><ShieldCheck size={23} className="text-blue-800"/><p className="mt-3 text-sm font-bold text-slate-900">Our mission</p><p className="mt-1 text-sm leading-6 text-slate-600">Connect Tayud residents with clear, convenient, and accountable barangay services.</p></div></div></section>


      <section id="contact" className="scroll-mt-20 border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-900">TugonBarangay · Barangay Tayud</p><p className="mt-1 text-slate-500">Consolacion, Cebu · <a className="text-blue-800 hover:underline" href="mailto:barangay@tugonbarangay.gov.ph">barangay@tugonbarangay.gov.ph</a></p></div><p className="text-xs text-slate-500">© {new Date().getFullYear()} TugonBarangay. All rights reserved.</p></div></section>
    </main>

    <div className="fixed bottom-4 right-4 z-30 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {greetingOpen && <div className="animate-[fade-in_.25s_ease-out_both] relative max-w-[290px] rounded-2xl border border-blue-100 bg-white px-4 py-3 pr-9 text-xs leading-5 text-slate-700 shadow-xl"><button onClick={() => setGreetingOpen(false)} aria-label="Dismiss BantayBot greeting" className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-slate-100"><X size={13}/></button><span className="font-bold text-blue-800">BantayBot</span><br/>Hi, Tayuranon! Need help finding a barangay service?</div>}
      <button onClick={() => startService("bantaybot")} className="group flex items-center gap-2.5 rounded-full bg-blue-800 py-2.5 pl-3 pr-5 text-sm font-bold text-white shadow-[0_8px_26px_rgba(11,63,145,.32)] transition hover:-translate-y-0.5 hover:bg-blue-900"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><Bot size={21}/></span><span>Chat with BantayBot</span></button>
    </div>

    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-label={modal === "login" ? "Log in" : "Create an account"} className={`auth-modal-enter relative my-auto max-h-[94vh] w-full ${modal === "login" ? "max-w-[440px]" : "max-w-[560px]"} overflow-y-auto rounded-2xl bg-white shadow-2xl sm:rounded-3xl`}><button type="button" aria-label="Close dialog" onClick={closeModal} className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"><X size={18}/></button>{modal === "login" ? <Login isModal /> : <Register isModal />}</div></div>}
  </div>;
}
