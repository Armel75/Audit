import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import MissionDetails from './pages/MissionDetails';
import MissionReport from './pages/MissionReport';
import FindingDetails from './pages/FindingDetails';
import RecommendationDetails from './pages/RecommendationDetails';
import AuditProgramDetails from './pages/AuditProgramDetails';
import Settings from './pages/Settings';
import AdminSettings from './pages/AdminSettings';
import Referential from './pages/Referential';
import AuditPlans from './pages/AuditPlans';
import AuditPlanDetails from './pages/AuditPlanDetails';
import CreateMission from './pages/CreateMission';
import MissionFindings from './pages/MissionFindings';
import FindingFormPage from './pages/FindingFormPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UserDetail from './pages/UserDetail';
import BusinessProcesses from './pages/BusinessProcesses';
import BusinessProcessForm from './pages/BusinessProcessForm';
import MissionEdit from './pages/MissionEdit';
import ProcedureFormPage from './pages/ProcedureFormPage';
import Evidences from './pages/Evidences';
import EvidenceCreate from './pages/EvidenceCreate';
import EvidenceEdit from './pages/EvidenceEdit';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter basename="/audit">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="plans" element={<AuditPlans />} />
            <Route path="plans/:id" element={<AuditPlanDetails />} />
            <Route path="missions" element={<Missions />} />
            <Route path="missions/:id" element={<MissionDetails />} />
            <Route path="missions/:id/report" element={<MissionReport />} />
            <Route path="programs/:id" element={<AuditProgramDetails />} />
            <Route path="programs/:programId/procedures/new" element={<ProcedureFormPage />} />
            <Route path="findings/:id" element={<FindingDetails />} />
            <Route path="recommendations/:id" element={<RecommendationDetails />} />
            <Route path="referential" element={<Referential />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<AdminSettings />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="/missions/new" element={<CreateMission />} />
            <Route path="/missions/:id/edit" element={<MissionEdit />} />
            <Route path="/missions/:id/findings" element={<MissionFindings />} />
            <Route path="/missions/:id/findings/new" element={<FindingFormPage />} />
            <Route path="/business-processes" element={<BusinessProcesses />} />
            <Route path="/business-processes/new" element={<BusinessProcessForm />} />
            <Route path="/business-processes/:id" element={<BusinessProcessForm />} />
            <Route path="/evidences" element={<Evidences />} />
            <Route path="/evidences/create" element={<EvidenceCreate />} />
            <Route path="/evidences/edit/:id" element={<EvidenceEdit />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
