import { apiFetch } from '../lib/api';
import { useEffect, useState } from 'react';

export default function RecommendationItem({ reco, onRefresh }: any) {
  const isOverdue = new Date(reco.targetDate) < new Date();
  const API_BASE = import.meta.env.VITE_API_URL;

  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchApproval = async () => {
    const res = await apiFetch(`${API_BASE}/approvals?recommendationId=${reco.id}`);
    if (!res.ok) return;

    const data = await res.json();

    if (data.length > 0) {
      setApprovalStatus(data[0].decision);
    } else {
      setApprovalStatus(null);
    }
  };

  useEffect(() => {
    fetchApproval();
  }, [reco.id]);

  const handleReject = async () => {
    if (!confirm('Rejeter cette recommandation ?')) return;

    try {
      const res = await apiFetch(`${API_BASE}/recommendations/${reco.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          reason: 'Recommandation non retenue'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erreur');
        return;
      }

      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestApproval = async () => {
    if (loading || approvalStatus === 'PENDING') return;

    setLoading(true);

    try {
      // 🔥 1. garantir état métier cohérent
      if (reco.status !== 'IMPLEMENTED') {
        await apiFetch(`${API_BASE}/recommendations/${reco.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IMPLEMENTED' })
        });
      }

      // 🔥 2. créer approval
      const res = await apiFetch(`${API_BASE}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalType: 'RECOMMENDATION_APPROVAL',
          recommendationId: reco.id,
          level: 1
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erreur');
        return;
      }

      await fetchApproval();
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="px-6 py-4 hover:bg-slate-50">
      <div className="flex justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-600">{reco.title}</p>

          <p className="text-xs text-slate-500 mt-1">
            Finding: {reco.finding.title}
          </p>

          <p className="text-sm text-slate-600 mt-2">{reco.actionPlan}</p>

          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-medium">Status: {reco.status}</span>
            <span>Progress: {reco.implementedPercent}%</span>

            <span className={isOverdue ? 'text-red-500' : ''}>
              Échéance: {new Date(reco.targetDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="text-right text-xs space-y-2">
          {reco.priority && <div>Priorité: {reco.priority.name}</div>}
          {reco.department && <div>Dept: {reco.department.name}</div>}

          {/* WORKFLOW */}
          {reco.status === 'DRAFT' && (
            <button
              onClick={async () => {
                await apiFetch(`${API_BASE}/recommendations/${reco.id}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'OPEN' })
                });
                onRefresh();
              }}
              className="text-xs px-3 py-1 bg-gray-600 text-white rounded"
            >
              Démarrer
            </button>
          )}

          {reco.status === 'OPEN' && (
            <button
              onClick={async () => {
                await apiFetch(`${API_BASE}/recommendations/${reco.id}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'IN_PROGRESS' })
                });
                onRefresh();
              }}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded"
            >
              Lancer
            </button>
          )}

          {reco.status === 'IN_PROGRESS' && (
            <button
              onClick={async () => {
                await apiFetch(`${API_BASE}/recommendations/${reco.id}/status`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'IMPLEMENTED' })
                });
                onRefresh();
              }}
              className="text-xs px-3 py-1 bg-purple-600 text-white rounded"
            >
              Marquer implémentée
            </button>
          )}

          {/* APPROVAL */}
          {reco.status === 'IMPLEMENTED' && approvalStatus !== 'PENDING' && (
            <button
              onClick={handleRequestApproval}
              disabled={loading}
              className="text-xs px-3 py-1 bg-indigo-600 text-white rounded"
            >
              Demander validation
            </button>
          )}

          {approvalStatus === 'PENDING' && (
            <span className="text-yellow-600 font-semibold">
              En attente de validation
            </span>
          )}

          {/* REJECT */}
          {['DRAFT', 'OPEN', 'IN_PROGRESS', 'IMPLEMENTED'].includes(reco.status) && (
            <button
              onClick={handleReject}
              className="text-xs px-3 py-1 bg-red-500 text-white rounded"
            >
              Rejeter
            </button>
          )}

          {reco.status === 'VALIDATED' && (
            <span className="text-green-600 font-semibold">Validée</span>
          )}

          {reco.status === 'REJECTED' && (
            <span className="text-red-600 font-semibold">Rejetée</span>
          )}
        </div>
      </div>
    </li>
  );
}