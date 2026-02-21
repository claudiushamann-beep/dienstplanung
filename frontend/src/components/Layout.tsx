import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CalendarCheck, 
  BarChart3, 
  Settings, 
  LogOut,
  Clock
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isPlaner = useAuthStore((s) => s.isPlaner());

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/mitarbeiter', icon: Users, label: 'Mitarbeiter' },
    { to: '/modell', icon: Clock, label: 'Dienstplanmodell', requirePlaner: true },
    { to: '/plan/soll', icon: Calendar, label: 'Soll-Plan', requirePlaner: true },
    { to: '/plan/ist', icon: CalendarCheck, label: 'Ist-Plan', requirePlaner: true },
    { to: '/statistik', icon: BarChart3, label: 'Statistik' },
    { to: '/einstellungen', icon: Settings, label: 'Einstellungen', requirePlaner: true },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">Dienstplanung</h1>
              </div>
              <div className="hidden sm:flex sm:ml-6 sm:space-x-1">
                {navItems.map((item) => {
                  if (item.requirePlaner && !isPlaner) return null;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">
                {user?.name} ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
