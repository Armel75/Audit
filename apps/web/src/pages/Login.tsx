import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Briefcase,
  FileSearch,
  Target,
  FolderLock,
  ArrowRight,
  Loader2,
  ClipboardCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // Used for register/forgot
  const [matricule, setMatricule] = useState(''); // Used for register
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const API_BASE = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Identifiant ou mot de passe invalide');

        login(data.accessToken, data.user);
        navigate('/dashboard');

      } else if (mode === 'register') {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ matricule, email, password, firstName, lastName })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erreur d\'inscription');

        setSuccess(data.message);
        setMode('login');

      } else if (mode === 'forgot') {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erreur lors de la demande');

        setSuccess("Un email de réinitialisation a été envoyé.");
        setEmail(''); // ✅ AJOUT ICI
        // ❌ NE PAS changer le mode
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const featureItems = [
    {
      icon: Briefcase,
      title: "Suivi des missions d’audit",
      description: "Planifiez, exécutez et suivez chaque mission avec une visibilité complète.",
    },
    {
      icon: FileSearch,
      title: 'Gestion des constats',
      description: "Centralisez les constats et structurez l’analyse des écarts.",
    },
    {
      icon: Target,
      title: 'Suivi des recommandations',
      description: "Pilotez les actions correctives jusqu’à leur clôture effective.",
    },
    {
      icon: ClipboardCheck,
      title: 'Pilotage des risques et contrôles',
      description: "Reliez risques, contrôles et dispositifs de maîtrise dans un même cadre.",
    },
    {
      icon: FolderLock,
      title: 'Gestion documentaire et preuves',
      description: "Sécurisez vos pièces justificatives, rapports et éléments probants.",
    },
  ];

  // 👇 AJOUT pour effet lumière dynamique
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        {/* LEFT PANEL */}
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_28%)]" />
          <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-[1200px] flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
            <div>
              <div className="mb-14 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 shadow-[0_10px_30px_rgba(16,185,129,0.16)] backdrop-blur-sm">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Plateforme d’audit
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-white">
                    <span className="text-emerald-400">SOREPCO</span>
                  </div>
                </div>
              </div>

              <div className="max-w-2xl animate-in fade-in slide-in-from-left-3 duration-700">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  Environnement de pilotage premium
                </div>

                <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-white xl:text-5xl">
                  Pilotez vos audits avec
                  <span className="block bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-200 bg-clip-text text-transparent">
                    précision et maîtrise
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">
                  Une plateforme conçue pour structurer vos missions, fiabiliser vos constats,
                  suivre vos recommandations et renforcer la maîtrise des risques dans un cadre
                  professionnel, rigoureux et traçable.
                </p>
              </div>

              <div className="mt-12 grid max-w-3xl grid-cols-1 gap-6 xl:grid-cols-2">
                {featureItems.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      onMouseMove={handleMouseMove}
                      className="group relative h-full [transform-style:preserve-3d]"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {/* Ambient glow (VISIBLE même sans hover) */}
                      <div className="absolute inset-0 rounded-3xl opacity-40 bg-[radial-gradient(500px_circle_at_20%_0%,rgba(16,185,129,0.12),transparent_60%)] blur-xl" />

                      {/* Hover glow */}
                      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(400px_circle_at_var(--x)_var(--y),rgba(16,185,129,0.35),transparent_40%)] blur-xl" />

                      {/* Card */}
                      <div
                        className="relative h-full rounded-3xl border border-white/10 backdrop-blur-xl p-6 transition-all duration-500"
                        style={{
                          transform: 'perspective(900px) rotateX(var(--rx)) rotateY(var(--ry))',
                          background: `
                            linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
                            rgba(2,6,23,0.75)
                          `
                        }}
                      >

                        {/* Inner permanent light (IMPORTANT → état idle premium) */}
                        <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(600px_circle_at_top_left,rgba(255,255,255,0.08),transparent_60%)]" />

                        {/* Hover light follow */}
                        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-300 bg-[radial-gradient(500px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.10),transparent_60%)]" />

                        {/* Sheen subtil permanent */}
                        <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.04)_40%,transparent_60%)] opacity-40" />

                        {/* Sheen animé au hover */}
                        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-700 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.18)_40%,transparent_60%)] translate-x-[-100%] group-hover:translate-x-[100%]" />

                        {/* Content */}
                        <div className="relative flex h-full flex-col justify-between">
                          <div className="flex items-start gap-4">
                            
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 shadow-inner transition group-hover:border-emerald-400/40">
                              <Icon className="h-5 w-5 text-emerald-400 transition duration-300 group-hover:scale-110" />
                            </div>

                            <div className="min-h-[72px]">
                              <h3 className="text-sm font-semibold text-white">
                                {item.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-300/90 group-hover:text-slate-200 transition">
                                {item.description}
                              </p>
                            </div>

                          </div>

                          <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-40 group-hover:opacity-100 transition" />
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>            
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-8">
              {/* Card 1 */}
              <div
                onMouseMove={handleMouseMove}
                className="group relative h-full overflow-hidden rounded-2xl p-[1px]"
              >
                {/* Glow border */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 bg-[radial-gradient(260px_circle_at_var(--x)_var(--y),rgba(16,185,129,0.25),transparent_45%)]" />

                {/* Card */}
                <div className="relative h-full rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/10 p-5 transition-all duration-300 group-hover:border-emerald-400/30 group-hover:shadow-[0_20px_60px_rgba(16,185,129,0.12)]">

                  {/* Light overlay */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 bg-[radial-gradient(400px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.06),transparent_60%)]" />

                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        Promesse produit
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-300 group-hover:text-slate-200 transition-colors">
                        Rigueur, traçabilité, conformité et pilotage métier réunis dans une expérience sobre et fiable.
                      </p>
                    </div>

                    {/* Ligne premium */}
                    <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition" />
                  </div>

                </div>
              </div>

              {/* Card 2 */}
              <div
                onMouseMove={handleMouseMove}
                className="group relative h-full overflow-hidden rounded-2xl p-[1px]"
              >
                {/* Glow border */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 bg-[radial-gradient(260px_circle_at_var(--x)_var(--y),rgba(16,185,129,0.25),transparent_45%)]" />

                {/* Card */}
                <div className="relative h-full rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/10 p-5 transition-all duration-300 group-hover:border-emerald-400/30 group-hover:shadow-[0_20px_60px_rgba(16,185,129,0.12)]">

                  {/* Light overlay */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 bg-[radial-gradient(400px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.06),transparent_60%)]" />

                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        Cadre d’usage
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-300 group-hover:text-slate-200 transition-colors">
                        Pensé pour les équipes audit, contrôle interne, conformité et gouvernance.
                      </p>
                    </div>

                    {/* Ligne premium */}
                    <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition" />
                  </div>

                </div>
              </div>

            </div>            
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-100/60 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-slate-200/60 blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-[460px]">
            {/* Mobile Branding */}
            <div className="mb-8 flex items-center gap-4 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Plateforme d’audit
                </div>
                <div className="text-2xl font-semibold tracking-tight text-slate-900">
                  <span className="text-emerald-600">SOREPCO</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Accès sécurisé
                </div>

                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {mode === 'login'
                    ? 'Connexion à votre espace'
                    : mode === 'register'
                    ? 'Demander un accès'
                    : 'Réinitialisation du mot de passe'}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {mode === 'login'
                    ? 'Accédez à votre environnement de pilotage audit en utilisant vos identifiants professionnels.'
                    : mode === 'register'
                    ? 'Renseignez vos informations professionnelles pour initier votre demande d’accès.'
                    : 'Saisissez votre adresse email professionnelle pour recevoir un lien sécurisé de réinitialisation.'}
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium leading-6 text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                  <p className="text-sm font-medium leading-6 text-emerald-800">{success}</p>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div className="space-y-5 animate-in fade-in duration-500">
                    <div>
                      <label htmlFor="matricule" className="mb-2 block text-sm font-semibold text-slate-700">
                        Matricule SOREPCO
                      </label>
                      <input
                        id="matricule"
                        type="text"
                        required
                        value={matricule}
                        onChange={e => setMatricule(e.target.value)}
                        className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                        placeholder="Ex : MAT-12345"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="firstName" className="mb-2 block text-sm font-semibold text-slate-700">
                          Prénom
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          required
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                          placeholder="Jean"
                        />
                      </div>

                      <div>
                        <label htmlFor="lastName" className="mb-2 block text-sm font-semibold text-slate-700">
                          Nom
                        </label>
                        <input
                          id="lastName"
                          type="text"
                          required
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                          placeholder="Dupont"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'login' ? (
                  <div className="animate-in fade-in duration-500">
                    <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-slate-700">
                      Email ou matricule
                    </label>
                    <input
                      id="identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="jean.dupont@sorepco.com"
                    />
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500">
                    <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                      Adresse email professionnelle
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="jean.dupont@sorepco.com"
                    />
                  </div>
                )}

                {mode !== 'forgot' && (
                  <div className="animate-in fade-in duration-500">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                        Mot de passe
                      </label>

                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                          className="text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600"
                        >
                          Mot de passe oublié ?
                        </button>
                      )}
                    </div>

                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center pt-0.5 animate-in fade-in duration-500">
                    <input
                      id="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 transition-colors cursor-pointer focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2.5 block cursor-pointer select-none text-sm text-slate-600"
                    >
                      Se souvenir de moi
                    </label>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition-all duration-200 hover:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-300" />
                        <span>Traitement en cours...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {mode === 'register'
                            ? 'Créer mon compte'
                            : mode === 'forgot'
                            ? 'Envoyer le lien de réinitialisation'
                            : 'Se connecter'}
                        </span>
                        {mode === 'login' && (
                          <ArrowRight className="ml-2 h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
                        )}
                      </>
                    )}
                  </button>
                </div>
                {mode === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="mt-3 text-sm text-slate-500 hover:text-emerald-600"
                  >
                    ← Retour à la connexion
                  </button>
                )}
              </form>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 font-medium text-slate-400">Ou</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                  >
                    {mode === 'login' ? 'Demander un accès' : 'Retour à la connexion'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 px-1 text-center text-xs leading-6 text-slate-500">
              © {new Date().getFullYear()} <span className="font-semibold text-slate-700">SOREPCO</span> — Plateforme de pilotage des audits, constats, recommandations, risques et preuves.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}