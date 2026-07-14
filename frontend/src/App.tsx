import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminMatches from './pages/Admin/Matches';
import AdminTeams from './pages/Admin/Teams';
import ControlPanel from './pages/Control/ControlPanel';
import Dashboard from './pages/Dashboard/Dashboard';
import MatchDetail from './pages/Match/MatchDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminMatches />} />
        <Route path="/admin" element={<AdminMatches />} />
        <Route path="/admin/matches" element={<AdminMatches />} />
        <Route path="/admin/teams" element={<AdminTeams />} />
        <Route path="/match/:id/control" element={<ControlPanel />} />
        <Route path="/match/:id/dashboard" element={<Dashboard />} />
        <Route path="/match/:id" element={<MatchDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
