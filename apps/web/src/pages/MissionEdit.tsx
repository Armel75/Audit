import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MissionForm from '../components/MissionForm';
import { apiFetch } from '../lib/api';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function MissionEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchMission = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/missions/${id}`);
        if (!res.ok) throw new Error();

        const data = await res.json();
        
        // Vérifier que le statut est PLANNED pour permettre l'édition
        if (data.status !== 'PLANNED') {
          setError('Seules les missions "Planifiées" peuvent être modifiées');
          setMission(null);
          setLoading(false);
          return;
        }
        
        setMission(data);
      } catch {
        setError('Erreur lors du chargement de la mission');
      } finally {
        setLoading(false);
      }
    };

    fetchMission();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement...</div>;
  
  if (error || !mission) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">Accès refusé</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error || 'Mission introuvable'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/missions')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux missions
        </button>
      </div>
    );
  }

  return (
    <MissionForm
      mission={mission}
      onSuccess={() => navigate('/missions')}
      onCancel={() => navigate('/missions')}
    />
  );
}