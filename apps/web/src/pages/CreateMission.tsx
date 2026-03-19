import { useNavigate } from 'react-router-dom';
import MissionForm from '../components/MissionForm';

export default function CreateMission() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/missions');
  };

  const handleCancel = () => {
    navigate('/missions');
  };

  return (
    <div className="p-6">
      <MissionForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}