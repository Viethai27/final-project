import { Menu, Bell, LogOut, Clock, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '../../types';
import { useState } from 'react';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản Trị Viên',
  RECEPTIONIST: 'Lễ Tân',
  COORDINATOR: 'Điều Phối / Điều Dưỡng',
  DOCTOR: 'Bác Sĩ',
  LAB_STAFF: 'Nhân Viên Cận Lâm Sàng',
  MANAGER: 'Quản Lý',
};

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  RECEPTIONIST: 'bg-blue-100 text-blue-700',
  COORDINATOR: 'bg-teal-100 text-teal-700',
  DOCTOR: 'bg-green-100 text-green-700',
  LAB_STAFF: 'bg-orange-100 text-orange-700',
  MANAGER: 'bg-rose-100 text-rose-700',
};

interface HeaderProps {
  onMenuClick: () => void;
  pageTitle?: string;
}

export default function Header({ onMenuClick, pageTitle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const now = new Date();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <Menu size={20} />
        </button>
        {pageTitle && (
          <h1 className="text-base font-semibold text-gray-800 hidden sm:block">{pageTitle}</h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Date/Time */}
        <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-500">
          <Clock size={14} />
          <span>
            {now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                {user.name.split(' ').pop()?.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 leading-none">{user.name.split(' ').slice(-2).join(' ')}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-medium text-sm text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.department}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    Đăng Xuất
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
