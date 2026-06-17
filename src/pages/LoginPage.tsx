import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Heart, LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const ROLE_REDIRECT: Record<UserRole, string> = {
  ADMIN: '/dashboard',
  RECEPTIONIST: '/reception',
  COORDINATOR: '/queue',
  DOCTOR: '/doctor',
  LAB_STAFF: '/lab',
  MANAGER: '/monitoring',
};

const TEST_ACCOUNTS = [
  'admin / admin123',
  'letan / letan123',
  'bsnam / bs123',
  'ktvxn / ktv123',
  'quanly / ql123',
];

export default function LoginPage() {
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_REDIRECT[user.role], { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-white">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={ROLE_REDIRECT[user.role]} replace />;
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await login(username.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.message ?? 'Đăng nhập thất bại.');
      return;
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_32%)]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-900 to-transparent" />

      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col justify-center text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 shadow-lg shadow-sky-900/30">
              <Heart size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">PAMEC MediFlow</h1>
              <p className="text-sm font-medium text-sky-200">Hệ thống điều phối bệnh nhân ngoại trú</p>
            </div>
          </div>

          <div className="mt-10 max-w-2xl">
            <p className="inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-100">
              Đăng nhập bằng tài khoản backend thật
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              Quản lý tiếp nhận, hàng đợi và khám bệnh theo đúng vai trò.
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              Phiên đăng nhập được xác thực qua API backend, kiểm tra trạng thái tài khoản và dùng token cho các
              thao tác nội bộ.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/15 bg-white p-6 shadow-2xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">Bước 1 - Auth thật</p>
            <h3 className="mt-2 text-2xl font-black text-gray-950">Đăng nhập hệ thống</h3>
            <p className="mt-2 text-sm text-gray-500">Sử dụng tài khoản đã seed trong database.</p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {error ? (
              <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 flex-shrink-0" size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Tài khoản</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type="text"
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  placeholder="Ví dụ: letan"
                  className="w-full rounded-2xl border border-gray-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Mật khẩu</label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full rounded-2xl border border-gray-200 py-3 pl-10 pr-11 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(value => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : null}
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tài khoản test từ seed</p>
            <div className="mt-3 grid gap-2 text-xs text-gray-600">
              {TEST_ACCOUNTS.map(account => (
                <code key={account} className="rounded-lg bg-white px-2 py-1 font-mono text-gray-700">
                  {account}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
