import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  User, 
  BookOpen, 
  Target, 
  FileText,
  Briefcase,
  ChevronRight,
  X
} from 'lucide-react';

interface MissionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  mission?: any;
}

export default function MissionForm({ onSuccess, onCancel, mission }: MissionFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [methodology, setMethodology] = useState('');
  const [planId, setPlanId] = useState('');
  const [auditTypeId, setAuditTypeId] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [plans, setPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditTypes, setAuditTypes] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditableEntities, setAuditableEntities] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const API_BASE = import.meta.env.VITE_API_URL;

  const getDateValidationErrors = (nextStartDate: string, nextEndDate: string) => {
    const errors = {
      startDate: '',
      endDate: ''
    };

    if (nextStartDate && nextEndDate && new Date(nextStartDate) > new Date(nextEndDate)) {
      errors.startDate = 'La date de debut doit etre anterieure a la date de fin';
      errors.endDate = 'La date de fin doit etre posterieure a la date de debut';
      return errors;
    }

    if ((nextStartDate && !nextEndDate) || (!nextStartDate && nextEndDate)) {
      errors.startDate = 'Les deux dates doivent etre renseignees';
      errors.endDate = 'Les deux dates doivent etre renseignees';
    }

    return errors;
  };

  const validateField = (name: string, value: any) => {
    let nextError = '';

    if (name === 'title' && !value) nextError = 'Le titre est obligatoire';
    if (name === 'description' && !value) nextError = 'La description est obligatoire';
    if (name === 'planId' && !value) nextError = 'Le plan est obligatoire';
    if (name === 'leaderId' && !value) nextError = 'Le chef de mission est obligatoire';

    if (name === 'dates') {
      const dateErrors = getDateValidationErrors(startDate, endDate);
      setFieldErrors((prev: any) => ({
        ...prev,
        startDate: dateErrors.startDate,
        endDate: dateErrors.endDate
      }));
      return;
    }

    setFieldErrors((prev: any) => ({
      ...prev,
      [name]: nextError
    }));
  };

  useEffect(() => {
    if (mission) {
      setTitle(mission.title || '');
      setDescription(mission.description || '');
      setObjective(mission.objective || '');
      setScopeDescription(mission.scopeDescription || '');
      setMethodology(mission.methodology || '');
      setPlanId(mission.planId || '');
      setAuditTypeId(mission.auditTypeId || '');
      setLeaderId(mission.leaderId || (mission.leader ? mission.leader.id : ''));
      setStartDate(mission.startDate ? new Date(mission.startDate).toISOString().split('T')[0] : '');
      setEndDate(mission.endDate ? new Date(mission.endDate).toISOString().split('T')[0] : '');
    }

    if (!mission) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
    }

    apiFetch(`${API_BASE}/plans?status=VALIDATED`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPlans(data.filter((p: any) => p.status === 'VALIDATED'));
        }
      });

    apiFetch(`${API_BASE}/settings/audit-types`)
      .then(res => res.json())
      .then(data => Array.isArray(data) && setAuditTypes(data))
      .catch(err => console.error('Failed to fetch audit types', err));

    apiFetch(`${API_BASE}/users`)
      .then(res => res.json())
      .then(data => Array.isArray(data) && setUsers(data))
      .catch(err => console.error('Failed to fetch users', err));

    apiFetch(`${API_BASE}/auditable-entities`)
      .then(res => res.json())
      .then(data => Array.isArray(data) && setAuditableEntities(data))
      .catch(err => console.error('Failed to fetch auditable entities', err));
  }, [mission]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Vérifier que seules les missions "PLANNED" peuvent être modifiées
    if (mission && mission.status !== 'PLANNED') {
      setError('Seules les missions "Planifiées" peuvent être modifiées');
      setSubmitting(false);
      return;
    }

    validateField('title', title);
    validateField('description', description);
    validateField('planId', planId);
    validateField('leaderId', leaderId);

    if (!title || !description || !planId || !leaderId) {
      setSubmitting(false);
      return;
    }

    const dateErrors = getDateValidationErrors(startDate, endDate);
    setFieldErrors((prev: any) => ({
      ...prev,
      startDate: dateErrors.startDate,
      endDate: dateErrors.endDate
    }));

    if (dateErrors.startDate || dateErrors.endDate) {
      setSubmitting(false);
      return;
    }

    try {
      const url = mission ? `${API_BASE}/missions/${mission.id}` : `${API_BASE}/missions`;
      const method = mission ? 'PUT' : 'POST';

      const payload: any = {
        title,
        description,
        objective,
        scopeDescription,
        methodology,
        planId: planId ? Number(planId) : null,
        auditTypeId: auditTypeId ? Number(auditTypeId) : null,
        leaderId: leaderId ? Number(leaderId) : null,
      };

      if (startDate) payload.startDate = new Date(startDate).toISOString();
      if (endDate) payload.endDate = new Date(endDate).toISOString();

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {mission ? 'Modifier la mission' : 'Nouvelle mission'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {mission ? 'Mise à jour des informations de la mission' : 'Créez une nouvelle mission d\'audit'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-200">Erreur</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Section 1: Informations Générales */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 px-6 py-4 border-b border-indigo-200 dark:border-indigo-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Informations générales
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Détails principaux de la mission</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Titre */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    validateField('title', e.target.value);
                  }}
                  placeholder="Ex: Audit de la trésorerie 2026"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium
                    ${fieldErrors.title 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 placeholder:text-red-400' 
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                />
                {fieldErrors.title && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    validateField('description', e.target.value);
                  }}
                  placeholder="Décrivez le contexte et la portée générale de cette mission..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 resize-none
                    ${fieldErrors.description 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 placeholder:text-red-400' 
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                />
                {fieldErrors.description && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {fieldErrors.description}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{description.length} caractères</p>
              </div>

              {/* Objectif */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  <Target className="w-4 h-4 inline mr-2 text-indigo-600" />
                  Objectif
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Quels sont les objectifs spécifiques de cette mission ?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 resize-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{objective.length} caractères</p>
              </div>

              {/* Méthodologie et Scope */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    <BookOpen className="w-4 h-4 inline mr-2 text-indigo-600" />
                    Méthodologie
                  </label>
                  <textarea
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    placeholder="Approches et méthodes utilisées..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 resize-none"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{methodology.length} caractères</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Périmètre
                  </label>
                  <textarea
                    value={scopeDescription}
                    onChange={(e) => setScopeDescription(e.target.value)}
                    placeholder="Décrire le périmètre et les limites..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 resize-none"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{scopeDescription.length} caractères</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Planification et Responsabilités */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 px-6 py-4 border-b border-emerald-200 dark:border-emerald-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Planification et responsabilités
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Plan, responsable et calendrier</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Plan et Chef de mission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Plan d'audit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={planId}
                    onChange={(e) => {
                      setPlanId(e.target.value);
                      validateField('planId', e.target.value);
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium appearance-none bg-no-repeat bg-right
                      ${fieldErrors.planId 
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100' 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="">Sélectionner un plan...</option>
                    {plans.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.year} - {p.title}</option>
                    ))}
                  </select>
                  {fieldErrors.planId && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {fieldErrors.planId}
                    </p>
                  )}
                </div>

                {/* Chef de mission */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    <User className="w-4 h-4 inline mr-2 text-emerald-600" />
                    Chef de mission <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={leaderId}
                    onChange={(e) => {
                      setLeaderId(e.target.value);
                      validateField('leaderId', e.target.value);
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium appearance-none bg-no-repeat bg-right
                      ${fieldErrors.leaderId 
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100' 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="">Sélectionner un responsable...</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                  {fieldErrors.leaderId && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {fieldErrors.leaderId}
                    </p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        const nextStartDate = e.target.value;
                        setStartDate(nextStartDate);
                        const dateErrors = getDateValidationErrors(nextStartDate, endDate);
                        setFieldErrors((prev: any) => ({
                          ...prev,
                          startDate: dateErrors.startDate,
                          endDate: dateErrors.endDate
                        }));
                      }}
                      max={endDate || undefined}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium
                        ${fieldErrors.startDate 
                          ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100' 
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        }`}
                    />
                  </div>
                  {fieldErrors.startDate && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {fieldErrors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        const nextEndDate = e.target.value;
                        setEndDate(nextEndDate);
                        const dateErrors = getDateValidationErrors(startDate, nextEndDate);
                        setFieldErrors((prev: any) => ({
                          ...prev,
                          startDate: dateErrors.startDate,
                          endDate: dateErrors.endDate
                        }));
                      }}
                      min={startDate || undefined}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium
                        ${fieldErrors.endDate 
                          ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100' 
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        }`}
                    />
                  </div>
                  {fieldErrors.endDate && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {fieldErrors.endDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Type d'audit */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  <Briefcase className="w-4 h-4 inline mr-2 text-emerald-600" />
                  Type d'audit
                </label>
                <select
                  value={auditTypeId}
                  onChange={(e) => setAuditTypeId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200 appearance-none bg-no-repeat bg-right font-medium"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="">Sélectionner un type...</option>
                  {auditTypes.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 flex items-center gap-2 hover:border-slate-300"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {submitting ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Enregistrer la mission
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
