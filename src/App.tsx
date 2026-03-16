import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import MissionDetails from './pages/MissionDetails';
import MissionReport from './pages/MissionReport';
import FindingDetails from './pages/FindingDetails';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="missions" element={<Missions />} />
          <Route path="missions/:id" element={<MissionDetails />} />
          <Route path="missions/:id/report" element={<MissionReport />} />
          <Route path="findings/:id" element={<FindingDetails />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
