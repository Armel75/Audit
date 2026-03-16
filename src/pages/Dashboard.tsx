import { FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { name: 'Missions en cours', value: '3', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Constats ouverts', value: '12', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Recommandations en retard', value: '4', icon: FileText, color: 'text-rose-600', bg: 'bg-rose-100' },
    { name: 'Missions clôturées (2026)', value: '8', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${item.bg}`}>
                    <Icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-slate-500">{item.name}</dt>
                      <dd>
                        <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Missions Récentes</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Audit Processus Achat - Q1</p>
                  <p className="text-sm text-slate-500">Démarrée le 10 Mars 2026</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  En cours
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Recommandations Critiques</h3>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Mise à jour politique sécurité</p>
                  <p className="text-sm text-rose-600 font-medium">Échéance dépassée (12 Mars)</p>
                </div>
                <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  Voir
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
