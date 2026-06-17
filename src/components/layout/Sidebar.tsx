import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  ListOrdered,
  Bell,
  Settings,
  Stethoscope,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { LogoPamec } from '../../assets/logo_pamec';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['ADMIN', 'MANAGER', 'COORDINATOR', 'RECEPTIONIST', 'LAB_STAFF'] },
  { label: 'Tiếp nhận', path: '/reception', icon: <ClipboardList size={18} />, roles: ['ADMIN', 'RECEPTIONIST', 'COORDINATOR'] },
  { label: 'Hàng đợi', path: '/queue', icon: <ListOrdered size={18} />, roles: ['ADMIN', 'COORDINATOR', 'RECEPTIONIST'] },
  { label: 'Điều phối', path: '/dispatch', icon: <ArrowRightLeft size={18} />, roles: ['ADMIN', 'COORDINATOR'] },
  { label: 'Phòng khám', path: '/doctor', icon: <Stethoscope size={18} />, roles: ['ADMIN'] },
  { label: 'Cận lâm sàng', path: '/lab', icon: <FlaskConical size={18} />, roles: ['ADMIN', 'LAB_STAFF'] },
  { label: 'Thanh toán', path: '/payment', icon: <CreditCard size={18} />, roles: ['ADMIN'] },
  { label: 'Theo dõi lượt khám', path: '/visit-tracking', icon: <Activity size={18} />, roles: ['ADMIN', 'COORDINATOR', 'MANAGER'] },
  { label: 'Giám sát tải', path: '/monitoring', icon: <Users size={18} />, roles: ['ADMIN', 'COORDINATOR', 'MANAGER'] },
  { label: 'Báo cáo', path: '/reports', icon: <BarChart3 size={18} />, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Cài đặt', path: '/settings', icon: <Settings size={18} />, roles: ['ADMIN'] },
];

const DOCTOR_NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', path: '/doctor', icon: <LayoutDashboard size={18} />, roles: ['DOCTOR'] },
  { label: 'Hàng đợi khám', path: '/doctor?view=queue', icon: <ListOrdered size={18} />, roles: ['DOCTOR'] },
  { label: 'Danh sách bệnh nhân', path: '/doctor?view=patients', icon: <Users size={18} />, roles: ['DOCTOR'] },
  { label: 'Kết quả cận lâm sàng', path: '/doctor?view=results', icon: <FlaskConical size={18} />, roles: ['DOCTOR'] },
  { label: 'Lịch làm việc', path: '/doctor?view=schedule', icon: <CalendarDays size={18} />, roles: ['DOCTOR'] },
  { label: 'Báo cáo cá nhân', path: '/doctor?view=reports', icon: <BarChart3 size={18} />, roles: ['DOCTOR'] },
  { label: 'Tài khoản', path: '/doctor?view=account', icon: <UserCircle size={18} />, roles: ['DOCTOR'] },
];

const RECEPTIONIST_NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', path: '/reception?view=overview', icon: <LayoutDashboard size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Tiếp nhận bệnh nhân', path: '/reception', icon: <ClipboardList size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Đăng ký khám / Đặt lịch', path: '/reception?view=appointments', icon: <CalendarDays size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Hàng đợi khám', path: '/queue', icon: <ListOrdered size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Danh sách bệnh nhân', path: '/reception?view=patients', icon: <Users size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Lịch làm việc bác sĩ', path: '/reception?view=doctors', icon: <Stethoscope size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Điều phối bệnh nhân', path: '/dispatch', icon: <ArrowRightLeft size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Thanh toán', path: '/payment', icon: <CreditCard size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Thông báo', path: '/reception?view=notifications', icon: <Bell size={18} />, roles: ['RECEPTIONIST'] },
  { label: 'Tài khoản', path: '/reception?view=account', icon: <UserCircle size={18} />, roles: ['RECEPTIONIST'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị',
  RECEPTIONIST: 'Lễ tân',
  COORDINATOR: 'Điều phối',
  DOCTOR: 'Bác sĩ',
  LAB_STAFF: 'Nhân viên CLS',
  MANAGER: 'Quản lý',
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const sourceItems = user?.role === 'DOCTOR'
    ? DOCTOR_NAV_ITEMS
    : user?.role === 'RECEPTIONIST'
      ? RECEPTIONIST_NAV_ITEMS
      : NAV_ITEMS;
  const visibleItems = sourceItems.filter(item => user ? item.roles.includes(user.role) : false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 z-30 h-full w-64 bg-slate-900 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <LogoPamec width="32px" height="32px" />
            </div>
            <div>
              <span className="text-white font-bold text-lg leading-none">PAMEC</span>
              <p className="text-slate-400 text-xs">Điều phối bệnh nhân</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {user && (
          <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user.name.split(' ').pop()?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.name}</p>
                <p className="text-sky-400 text-xs">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {visibleItems.map(item => (
            <NavLink
              key={`${item.label}-${item.path}`}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) => {
                const currentPath = `${location.pathname}${location.search}`;
                const queryScopedRole = user?.role === 'DOCTOR' || user?.role === 'RECEPTIONIST';
                const active = queryScopedRole
                  ? currentPath === item.path
                  : isActive || location.pathname === item.path;
                return clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-sky-100 text-sky-800 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/70 hover:text-white',
                );
              }}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-700">
          <p className="text-slate-500 text-xs text-center">
            MediFlow v1.0 - {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>
      </aside>
    </>
  );
}
