import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HierarchyCommentsOverview from './pages/HierarchyCommentsOverview';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import MissionDetails from './pages/MissionDetails';
import MissionReport from './pages/MissionReport';
import MissionProtocol from './pages/MissionProtocol';
import FindingDetails from './pages/FindingDetails';
import RecommendationDetails from './pages/RecommendationDetails';
import AuditProgramDetails from './pages/AuditProgramDetails';
import Settings from './pages/Settings';
import AdminSettings from './pages/AdminSettings';
import Referential from './pages/Referential';
import AuditableEntities from './pages/AuditableEntities';
import ProcessusMetier from './pages/ProcessusMetier';
import CriticalFindings from './pages/CriticalFindings';
import OverdueRecommendations from './pages/OverdueRecommendations';
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
import FindingEdit from './pages/FindingEdit';
import DashboardDG from './pages/DashboardDG';
import MissionsDashboard from './pages/MissionsDashboard';
import ApprovalCenter from './pages/ApprovalCenter';
import NotificationsPage from './pages/NotificationsPage';

const hasAnyPermission = (userPermissions: string[] | undefined, requiredPermissions?: string[]) => {
  if (!requiredPermissions?.length) {
    return true;
  }

  const permissions = userPermissions || [];
  return requiredPermissions.some((permission) => permissions.includes(permission));
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const PermissionRoute = ({
  children,
  requiredPermissions,
}: {
  children: React.ReactNode;
  requiredPermissions?: string[];
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!hasAnyPermission(user?.permissions, requiredPermissions)) {
    return <Navigate to="/dashboard" replace />;
  }

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
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="hierarchy-comments" element={<PermissionRoute requiredPermissions={['comment:read']}><HierarchyCommentsOverview /></PermissionRoute>} />
            <Route path="dashboard-dg" element={<PermissionRoute requiredPermissions={['dashboard_dg:read']}><DashboardDG /></PermissionRoute>} />
            <Route path="plans" element={<PermissionRoute requiredPermissions={['audit_plan:read']}><AuditPlans /></PermissionRoute>} />
            <Route path="plans/:id" element={<PermissionRoute requiredPermissions={['audit_plan:read']}><AuditPlanDetails /></PermissionRoute>} />
            <Route path="missions" element={<PermissionRoute requiredPermissions={['audit_mission:read', 'audit_mission:read_all']}><Missions /></PermissionRoute>} />
            <Route path="missions-dashboard" element={<PermissionRoute requiredPermissions={['audit_mission:read', 'audit_mission:read_all']}><MissionsDashboard /></PermissionRoute>} />
            <Route path="missions/archive" element={<PermissionRoute requiredPermissions={['audit_mission:read', 'audit_mission:read_all']}><Missions mode="archive" /></PermissionRoute>} />
            <Route path="missions/:id" element={<PermissionRoute requiredPermissions={['audit_mission:read', 'audit_mission:read_all']}><MissionDetails /></PermissionRoute>} />
            <Route path="missions/:id/report" element={<PermissionRoute requiredPermissions={['audit_mission:read', 'audit_mission:read_all']}><MissionReport /></PermissionRoute>} />
            <Route path="missions/:id/protocol" element={<PermissionRoute requiredPermissions={['audit_mission:read', 'audit_mission:read_all']}><MissionProtocol /></PermissionRoute>} />
            <Route path="programs/:id" element={<PermissionRoute requiredPermissions={['audit_program:read']}><AuditProgramDetails /></PermissionRoute>} />
            <Route path="programs/:programId/procedures/new" element={<PermissionRoute requiredPermissions={['audit_procedure:create']}><ProcedureFormPage /></PermissionRoute>} />
            <Route path="findings/critical" element={<PermissionRoute requiredPermissions={['finding:read']}><CriticalFindings /></PermissionRoute>} />
            <Route path="findings/:id" element={<PermissionRoute requiredPermissions={['finding:read']}><FindingDetails /></PermissionRoute>} />
            <Route path="recommendations/overdue" element={<PermissionRoute requiredPermissions={['recommendation:read']}><OverdueRecommendations /></PermissionRoute>} />
            <Route path="recommendations/:id" element={<PermissionRoute requiredPermissions={['recommendation:read']}><RecommendationDetails /></PermissionRoute>} />
            <Route path="referential" element={<PermissionRoute requiredPermissions={['referential:access']}><Referential /></PermissionRoute>} />
            <Route path="auditable-entities" element={<AuditableEntities />} />
            <Route path="processus-metier" element={<ProcessusMetier />} />
            <Route path="settings" element={<PermissionRoute requiredPermissions={['settings:read']}><Settings /></PermissionRoute>} />
            <Route path="admin" element={<PermissionRoute requiredPermissions={['admin:access']}><AdminSettings /></PermissionRoute>} />
            <Route path="users/:id" element={<PermissionRoute requiredPermissions={['user:read']}><UserDetail /></PermissionRoute>} />
            <Route path="/missions/new" element={<PermissionRoute requiredPermissions={['audit_mission:create']}><CreateMission /></PermissionRoute>} />
            <Route path="/missions/:id/edit" element={<PermissionRoute requiredPermissions={['audit_mission:update', 'audit_mission:intake']}><MissionEdit /></PermissionRoute>} />
            <Route path="/missions/:id/findings" element={<PermissionRoute requiredPermissions={['finding:read']}><MissionFindings /></PermissionRoute>} />
            <Route path="/missions/:id/findings/new" element={<PermissionRoute requiredPermissions={['finding:create']}><FindingFormPage /></PermissionRoute>} />
            <Route path="/findings/:id/edit" element={<PermissionRoute requiredPermissions={['finding:update']}><FindingEdit /></PermissionRoute>} />
            <Route path="/business-processes" element={<PermissionRoute requiredPermissions={['business_process:read']}><BusinessProcesses /></PermissionRoute>} />
            <Route path="/business-processes/new" element={<PermissionRoute requiredPermissions={['business_process:create']}><BusinessProcessForm /></PermissionRoute>} />
            <Route path="/business-processes/:id" element={<PermissionRoute requiredPermissions={['business_process:update', 'business_process:read']}><BusinessProcessForm /></PermissionRoute>} />
            <Route path="/evidences" element={<PermissionRoute requiredPermissions={['evidence:read']}><Evidences /></PermissionRoute>} />
            <Route path="/evidences/create" element={<PermissionRoute requiredPermissions={['evidence:create']}><EvidenceCreate /></PermissionRoute>} />
            <Route path="/evidences/edit/:id" element={<PermissionRoute requiredPermissions={['evidence:create']}><EvidenceEdit /></PermissionRoute>} />
            <Route path="/approvals" element={<PermissionRoute requiredPermissions={['approval:read']}><ApprovalCenter /></PermissionRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
