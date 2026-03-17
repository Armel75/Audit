import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, AlertCircle, Briefcase, Calendar, Users, Edit2, Trash2 } from 'lucide-react';
import MissionFormModal from '../components/MissionFormModal';
import { apiFetch } from '../lib/api';

interface Mission {
  id: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'VALIDATED' | 'CLOSED';
  leader: { id: string; firstName: string; lastName: string; email: string };
  planId: string;
  _count: { findings: number; documents: number };
}

const statusConfig = {
  PLANNED: { label: 'Planifiée', color: 'bg-slate-100 text-slate-800' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  IN_REVIEW: { label: 'En revue', color: 'bg-purple-100 text-purple-800' },
  VALIDATED: { label: 'Validée', color: 'bg-emerald-100 text-emerald-800' },
  CLOSED: { label: 'Clôturée', color: 'bg-slate-800 text-white' },
};

export default function Missions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/missions');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des missions');
      }
      const data = await response.json();
      setMissions(data);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const handleOpenCreate = () => {
    setEditingMission(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, mission: Mission) => {
    e.preventDefault(); // Prevent link navigation
    setEditingMission(mission);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent link navigation
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) return;
    try {
      const response = await apiFetch(`/api/missions/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchMissions();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Failed to delete mission', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Missions d'audit</h1>
          <p className="mt-2 text-sm text-slate-700">
            Liste des missions d'audit du plan annuel en cours.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Nouvelle Mission
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 leading-5 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
            placeholder="Rechercher une mission..."
          />
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
          <Filter className="-ml-1 mr-2 h-5 w-5 text-slate-400" />
          Filtres
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-slate-500">Chargement des missions...</div>
        </div>
      ) : missions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">Aucune mission</h3>
          <p className="text-slate-500">Commencez par créer une nouvelle mission d'audit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {missions.map((mission) => {
            const conf = statusConfig[mission.status] || statusConfig.PLANNED;
            return (
              <Link
                key={mission.id}
                to={`/missions/${mission.id}`}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow relative group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${conf.color}`}>
                    {conf.label}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleOpenEdit(e, mission)} 
                      className="text-slate-400 hover:text-blue-600 p-1"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, mission.id)} 
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                  {mission.title}
                </h3>
                
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {mission.startDate ? new Date(mission.startDate).toLocaleDateString() : 'Non définie'} 
                      {' - '} 
                      {mission.endDate ? new Date(mission.endDate).toLocaleDateString() : 'Non définie'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>Chef: {mission.leader.firstName} {mission.leader.lastName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>{mission._count.findings} constat(s)</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <MissionFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setIsModalOpen(false);
          fetchMissions();
        }}
        mission={editingMission}
      />
    </div>
  );
}
