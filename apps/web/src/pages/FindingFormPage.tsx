import { useParams, useNavigate } from 'react-router-dom';
import FindingForm from '../components/FindingForm';

export default function FindingFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="p-6 dark:bg-slate-900 min-h-screen">
      <FindingForm
        missionId={id!}
        onSuccess={() => navigate(`/missions/${id}/findings`)}
      />
    </div>
  );
}