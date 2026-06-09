import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Heart, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const DEMO_ROLES: { role: UserRole; label: string; desc: string; color: string }[] = [
  { role: 'ADMIN', label: 'Quản Trị', desc: 'Toàn quyền', color: 'from-purple-500 to-purple-700' },
  { role: 'RECEPTIONIST', label: 'Lễ Tân', desc: 'Tiếp nhận BN', color: 'from-blue-500 to-blue-700' },
  { role: 'COORDINATOR', label: 'Điều Phối', desc: 'Điều dưỡng', color: 'from-teal-500 to-teal-700' },
  { role: 'DOCTOR', label: 'Bác Sĩ', desc: 'Phòng khám', color: 'from-green-500 to-green-700' },
  { role: 'LAB_STAFF', label: 'Nhân Viên CLS', desc: 'Xét nghiệm', color: 'from-orange-500 to-orange-700' },
  { role: 'MANAGER', label: 'Quản Lý', desc: 'Giám sát', color: 'from-rose-500 to-rose-700' },
];

const ROLE_REDIRECT: Record<UserRole, string> = {
  ADMIN: '/dashboard',
  RECEPTIONIST: '/reception',
  COORDINATOR: '/queue',
  DOCTOR: '/doctor',
  LAB_STAFF: '/lab',
  MANAGER: '/monitoring',
};

export default function LoginPage() {
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message ?? 'Đăng nhập thất bại');
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    loginAsDemo(role);
    navigate(ROLE_REDIRECT[role]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-900 to-slate-800 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 bg-sky-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-start">
        {/* Left: Brand */}
        <div className="text-white space-y-6 lg:pt-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Heart size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">MediFlow</h1>
              <p className="text-sky-300 text-sm">Patient Flow Coordinator</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold leading-tight">Hệ Thống Điều Phối<br />Bệnh Nhân Ngoại Trú</h2>
            <p className="text-slate-300 mt-3 text-sm leading-relaxed">
              Quản lý luồng bệnh nhân thông minh: từ tiếp nhận, khám lâm sàng, cận lâm sàng đến thanh toán. 
              Giảm thời gian chờ, phát hiện điểm nghẽn, điều phối theo thời gian thực.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: '40%', label: 'Giảm thời gian chờ' },
              { val: '≥95%', label: 'Sự hài lòng của BN' },
              { val: 'Thực tế', label: 'Dữ liệu realtime' },
              { val: 'Đa vai trò', label: '6 loại người dùng' },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xl font-bold text-sky-300">{item.val}</p>
                <p className="text-xs text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login + Demo */}
        <div className="space-y-4">
          {/* Login form */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Đăng Nhập</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tài khoản</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
              </button>
            </form>
            <div className="mt-3 text-xs text-gray-400 text-center">
              Demo: admin/admin123 · letan/letan123 · bsnam/bs123
            </div>
          </div>

          {/* Demo role quick login */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-white text-sm font-semibold mb-3">Đăng nhập nhanh theo vai trò (Demo)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_ROLES.map(({ role, label, desc, color }) => (
                <button
                  key={role}
                  onClick={() => handleDemoLogin(role)}
                  className={`bg-gradient-to-br ${color} text-white p-3 rounded-xl text-left hover:scale-105 transition-transform shadow-md`}
                >
                  <p className="text-sm font-bold leading-none">{label}</p>
                  <p className="text-xs opacity-80 mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
