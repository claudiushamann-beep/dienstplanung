import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import ShiftModels from './pages/ShiftModels';
import ScheduleSoll from './pages/ScheduleSoll';
import ScheduleIst from './pages/ScheduleIst';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Konsole from './pages/Konsole';

function PrivateRoute({ children, requirePlaner = false }: { children: React.ReactNode; requirePlaner?: boolean }) {
  const { isAuthenticated, isPlaner } = useAuthStore();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  if (requirePlaner && !isPlaner()) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="mitarbeiter" element={<PrivateRoute><Employees /></PrivateRoute>} />
          <Route path="mitarbeiter/:id" element={<PrivateRoute><EmployeeDetail /></PrivateRoute>} />
          <Route path="modell" element={<PrivateRoute requirePlaner><ShiftModels /></PrivateRoute>} />
          <Route path="plan/soll" element={<PrivateRoute requirePlaner><ScheduleSoll /></PrivateRoute>} />
          <Route path="plan/ist" element={<PrivateRoute requirePlaner><ScheduleIst /></PrivateRoute>} />
          <Route path="statistik" element={<PrivateRoute><Statistics /></PrivateRoute>} />
          <Route path="einstellungen" element={<PrivateRoute requirePlaner><Settings /></PrivateRoute>} />
          <Route path="konsole" element={<PrivateRoute requirePlaner><Konsole /></PrivateRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
