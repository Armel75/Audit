import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function ApprovalCenter() {
    const [approvals, setApprovals] = useState([]);
        
    const API_BASE = import.meta.env.VITE_API_URL;

    const fetchApprovals = async () => {

    const res = await apiFetch(`${API_BASE}/approvals`);

    const data = await res.json();
    setApprovals(data.filter((a: any) => a.decision === 'PENDING'));
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (id: number, decision: string) => {
    await apiFetch(`${API_BASE}/approvals/${id}/decide`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });

    fetchApprovals();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Centre d’approbation</h1>

      {approvals.map((a: any) => (
        <div key={a.id} className="border p-4 rounded flex justify-between">
          <div>
            <div>Type: {a.approvalType}</div>
            <div>
                {a.missionId && <div>Mission: {a.missionId}</div>}
                {a.recommendationId && <div>Reco: {a.recommendationId}</div>}
                {a.findingId && <div>Finding: {a.findingId}</div>}
                {a.programId && <div>Program: {a.programId}</div>}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleDecision(a.id, 'APPROVED')}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              Valider
            </button>

            <button
              onClick={() => handleDecision(a.id, 'REJECTED')}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              Rejeter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}