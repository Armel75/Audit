import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import FindingForm from '../components/FindingForm';
import { apiFetch } from '../lib/api';

export default function FindingEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const API_BASE = import.meta.env.VITE_API_URL;
  const prefilledReason = (location.state as { editReason?: string } | null)?.editReason || '';

  useEffect(() => {
    if (!id) return;
    
    apiFetch(`${API_BASE}/findings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur chargement');
        return res.json();
      })
      .then(data => {
        setInitialData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (error || !initialData) return <div className="p-8 text-center text-red-500">{error || 'Introuvable'}</div>;

  const handleSuccess = () => {
    navigate(`/findings/${id}`);
  };

  return (
    <FindingForm 
      findingId={id!} 
      missionId={initialData.mission.id.toString()}
      initialEditReason={prefilledReason}
      initialData={initialData}
      onSuccess={handleSuccess}
      onCancel={() => navigate(`/findings/${id}`)}
    />
  );
}
