import { apiFetch } from '../lib/api';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Edit2, Paperclip } from 'lucide-react';
import RecommendationFormModal from './RecommendationFormModal';

const recoStatusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  OPEN: 'Ouverte',
  IN_PROGRESS: 'En cours',
  IMPLEMENTED: 'Implémentée',
  VALIDATED: 'Validée',
  REJECTED: 'Rejetée',
  CLOSED: 'Clôturée',
};

export default function RecommendationItem({ reco, onRefresh }: any) {
  const isOverdue = new Date(reco.targetDate) < new Date();
  const API_BASE = import.meta.env.VITE_API_URL;

  const getAssigneeLabels = (reco: any): string[] => {
    if (!reco) return [];
    
    const labels: string[] = [];
    const addValue = (value: any) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(addValue);
        return;
      }
      if (typeof value === 'object') {
        if (value.firstName && value.lastName) {
          labels.push(`${value.firstName} ${value.lastName}`.trim());
          return;
        }
        if (value.fullName || value.email) {
          labels.push((value.fullName || value.email || '').trim());
          return;
        }
        if (value.name) {
          labels.push(String(value.name).trim());
          return;
        }
      }
      if (typeof value === 'string' && value.trim()) {
        labels.push(...value.split(/[;,]+/).map((item) => item.trim()).filter(Boolean));
      }
    };

    addValue(reco.assigneeUsers ?? reco.assigneeUser);
    addValue(reco.assigneeGlpiUsers ?? reco.assigneeGlpiUser);
    addValue(reco.assigneeNames ?? reco.assigneeName);

    return Array.from(new Set(labels.filter(Boolean)));
  };

  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const updateStatus = async (status: string, reason: string) => {
    const res = await apiFetch(`${API_BASE}/recommendations/${reco.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Erreur');
    }
  };

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

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('recommendationId', String(reco.id));

        const res = await apiFetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || 'Erreur lors de l\'upload');
        }
      }

      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      event.target.value = '';
      setUploading(false);
    }
  };

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
        await updateStatus('IMPLEMENTED', 'Passage en implementation avant demande de validation');
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
    <>
    <li className="px-6 py-5 hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-600">{reco.title}</p>

          <p className="text-xs text-slate-500 mt-1">
            Constat : {reco.finding.title}
          </p>

          {(() => {
            const assignees = getAssigneeLabels(reco);
            return assignees.length > 0 ? (
              <p className="text-xs text-slate-500 mt-2">
                <span className="font-medium text-slate-700">Responsable{assignees.length > 1 ? 's' : ''}:</span>{' '}
                {assignees.join(' • ')}
              </p>
            ) : null;
          })()}

          <p className="text-sm text-slate-600 mt-2">{reco.actionPlan}</p>

          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-medium">Statut : {recoStatusLabels[reco.status] ?? reco.status}</span>
            <span>Avancement : {reco.implementedPercent}%</span>

            <span className={isOverdue ? 'text-red-500' : ''}>
              Échéance : {new Date(reco.targetDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="text-right text-xs space-y-3">
          {reco.priority && <div>Priorité: {reco.priority.name}</div>}
          {reco.department && <div>Dept: {reco.department.name}</div>}

          {/* WORKFLOW */}
          {reco.status === 'DRAFT' && (
            <button
              onClick={async () => {
                try {
                  await updateStatus('OPEN', 'Ouverture de la recommandation');
                  onRefresh();
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="inline-flex items-center rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white"
            >
              Démarrer
            </button>
          )}

          {reco.status === 'OPEN' && (
            <button
              onClick={async () => {
                try {
                  await updateStatus('IN_PROGRESS', 'Demarrage de la recommandation');
                  onRefresh();
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Lancer
            </button>
          )}

          {reco.status === 'IN_PROGRESS' && (
            <button
              onClick={async () => {
                try {
                  await updateStatus('IMPLEMENTED', 'Marquage de la recommandation comme implementee');
                  onRefresh();
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white"
            >
              Marquer implémentée
            </button>
          )}

          {/* APPROVAL */}
          {reco.status === 'IMPLEMENTED' && approvalStatus !== 'PENDING' && (
            <button
              onClick={handleRequestApproval}
              disabled={loading}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
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
              className="inline-flex items-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white"
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
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                disabled={['VALIDATED', 'CLOSED'].includes(reco.status)}
                title={['VALIDATED', 'CLOSED'].includes(reco.status) ? 'Modification impossible : recommandation validée' : 'Modifier la recommandation'}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Edit2 className="h-4 w-4" />
                <span>Modifier recommandation</span>
              </button>
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                title="Ajouter une piece jointe"
              >
                <Paperclip className="h-4 w-4" />
                <span>{uploading ? 'Ajout en cours...' : 'Ajouter piece jointe'}</span>
                <input type="file" multiple className="hidden" onChange={handleAttachmentUpload} />
              </label>
            </div>
          </div>

          <Link
            to={`/recommendations/${reco.id}`}
            className="mt-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
            title="Voir les details de la recommandation"
          >
            <span>Voir details</span>
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </li>
    <RecommendationFormModal
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      findingId={reco.finding.id}
      recommendation={reco}
      onSuccess={() => {
        setIsEditModalOpen(false);
        onRefresh();
      }}
    />
    </>
  );
}
