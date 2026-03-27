import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MissionForm from '../components/MissionForm';
import { apiFetch } from '../lib/api';

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
        setMission(data);
      } catch {
        setError('Erreur chargement mission');
      } finally {
        setLoading(false);
      }
    };

    fetchMission();
  }, [id]);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>{error}</div>;
  if (!mission) return <div>Mission introuvable</div>;

  return (
    <MissionForm
      mission={mission}
      onSuccess={() => navigate('/missions')}
      onCancel={() => navigate('/missions')}
    />
  );
}