import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle, AlertCircle, Briefcase, FileSearch, Target, FolderLock, ArrowRight, Loader2 } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Identifiant ou mot de passe invalide');
        
        login(data.accessToken, data.user);
        navigate('/dashboard');
        
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matricule, email, password, firstName, lastName })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Erreur d\'inscription');
        
        setSuccess(data.message);
        setMode('login');
        
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Erreur lors de la demande');
        
        setSuccess(data.message);
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* LEFT PANEL - VALUE PROP */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-slate-950 text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">SISAR</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight mb-6 leading-[1.15] text-slate-50">
            Maîtrise, conformité et <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              pilotage stratégique.
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg max-w-md mb-16 leading-relaxed">
            La plateforme de référence pour superviser vos activités d'audit, garantir la conformité et piloter vos plans d'actions avec une rigueur absolue.
          </p>

          <div className="space-y-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 border border-slate-800 shadow-sm mt-1">
                <Briefcase className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <h3 className="font-medium text-slate-200 text-base">Gestion des missions d'audit</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">Planifiez, exécutez et supervisez l'intégralité de vos cycles d'audit en toute transparence.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 border border-slate-800 shadow-sm mt-1">
                <FileSearch className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <h3 className="font-medium text-slate-200 text-base">Suivi des constats & risques</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">Centralisez les anomalies, évaluez les impacts et cartographiez vos risques opérationnels.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 border border-slate-800 shadow-sm mt-1">
                <Target className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <h3 className="font-medium text-slate-200 text-base">Pilotage des recommandations</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">Déployez et suivez l'avancement de vos plans d'actions correctifs en temps réel.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 border border-slate-800 shadow-sm mt-1">
                <FolderLock className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <h3 className="font-medium text-slate-200 text-base">Gestion documentaire sécurisée</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">Centralisez vos preuves d'audit et rapports dans un espace hautement sécurisé.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 pt-8 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              © {new Date().getFullYear()} SOREPCO
            </p>
            <p className="text-xs text-slate-600">
              Système de Suivi des Audits et Recommandations
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - FORM */}
      <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col justify-center px-6 sm:px-12 md:px-24 lg:px-32 relative bg-white">
        
        <div className="w-full max-w-[420px] mx-auto">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">SISAR</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
              {mode === 'login' ? 'Connexion' : mode === 'register' ? 'Créer un compte' : 'Mot de passe oublié'}
            </h2>
            <p className="text-base text-slate-500">
              {mode === 'login' 
                ? 'Saisissez vos identifiants pour accéder à votre espace.' 
                : mode === 'register' 
                ? 'Renseignez vos informations professionnelles pour demander un accès.' 
                : 'Un lien sécurisé vous sera envoyé par email.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-8 rounded-xl bg-red-50/80 p-4 border border-red-100 flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-8 rounded-xl bg-emerald-50/80 p-4 border border-emerald-100 flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 font-medium leading-relaxed">{success}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="space-y-5 animate-in fade-in duration-500">
                <div>
                  <label htmlFor="matricule" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Matricule SOREPCO
                  </label>
                  <input 
                    id="matricule" type="text" required value={matricule} onChange={e => setMatricule(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 sm:text-sm"
                    placeholder="Ex: MAT-12345"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">Prénom</label>
                    <input 
                      id="firstName" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} 
                      className="block w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 sm:text-sm" 
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">Nom</label>
                    <input 
                      id="lastName" type="text" required value={lastName} onChange={e => setLastName(e.target.value)} 
                      className="block w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 sm:text-sm" 
                      placeholder="Dupont"
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === 'login' ? (
              <div className="animate-in fade-in duration-500">
                <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email ou Matricule
                </label>
                <input 
                  id="identifier" type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 sm:text-sm"
                  placeholder="jean.dupont@sorepco.com"
                />
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Adresse email professionnelle
                </label>
                <input 
                  id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 sm:text-sm"
                  placeholder="jean.dupont@sorepco.com"
                />
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Mot de passe
                  </label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }} 
                      className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <input 
                  id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center animate-in fade-in duration-500 pt-1">
                <input 
                  id="remember-me" type="checkbox" 
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 transition-colors cursor-pointer" 
                />
                <label htmlFor="remember-me" className="ml-2.5 block text-sm text-slate-600 cursor-pointer select-none">
                  Se souvenir de moi
                </label>
              </div>
            )}

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading} 
                className="group relative flex w-full justify-center items-center rounded-lg border border-transparent bg-slate-900 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-400" />
                    <span>Traitement en cours...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'register' ? "Créer mon compte" : mode === 'forgot' ? "Envoyer le lien de réinitialisation" : "Se connecter"}
                    </span>
                    {mode === 'login' && <ArrowRight className="w-4 h-4 ml-2 opacity-70 group-hover:translate-x-1 transition-transform" />}
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-slate-400 font-medium">Ou</span>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                  setSuccess(null);
                }}
                className="flex w-full justify-center items-center rounded-lg border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all duration-200"
              >
                {mode === 'login' ? "Demander un accès (Inscription)" : "Retour à la connexion"}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
