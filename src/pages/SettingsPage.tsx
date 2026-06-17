import { Activity, Database, ShieldCheck, UserCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';

function InfoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-black text-gray-900">{value}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '/api';
  const proxyTarget = import.meta.env.VITE_PROXY_TARGET ?? 'Not configured';

  return (
    <Layout pageTitle="Cai Dat He Thong">
      <div className="space-y-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900">Cau hinh dang dung cua frontend</p>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Trang nay duoc them de menu /settings khong bi redirect ve fallback. Cac gia tri ben duoi doc truc tiep tu
                Vite env thay vi hardcode trong component.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="API base"
            value={apiBaseUrl}
            description="Frontend service layer se goi API qua base URL nay."
          />
          <InfoCard
            label="Vite proxy"
            value={proxyTarget}
            description="Khi API base la /api, Vite proxy chuyen request den backend target nay."
          />
          <InfoCard
            label="Tai khoan"
            value={user?.username ?? 'unknown'}
            description={`Role hien tai: ${user?.role ?? 'unknown'}.`}
          />
          <InfoCard
            label="Xac thuc"
            value="Demo session"
            description="Auth hien tai lay user tu sessionStorage trong AuthContext."
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-sky-600" />
              <p className="text-sm font-semibold text-gray-800">Data source</p>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Cac man hinh nghiep vu su dung service layer trong src/services va khong hardcode localhost trong component.
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-emerald-600" />
              <p className="text-sm font-semibold text-gray-800">Routing</p>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Route /settings da duoc register trong App.tsx va duoc bao ve cho ADMIN.
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UserCircle size={18} className="text-indigo-600" />
              <p className="text-sm font-semibold text-gray-800">Nguoi dung</p>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {user?.name ?? 'Chua dang nhap'} dang thao tac voi quyen {user?.role ?? 'unknown'}.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
