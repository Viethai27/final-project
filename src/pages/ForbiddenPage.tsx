import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';

export default function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <Layout pageTitle="Không có quyền truy cập">
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert size={32} />
        </div>
        <h1 className="mt-5 text-2xl font-black text-gray-900">Không có quyền truy cập</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Tài khoản {user?.username ? <strong>{user.username}</strong> : 'hiện tại'} không có quyền mở chức năng này.
          Vui lòng quay lại màn hình phù hợp với vai trò của bạn.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Quay về trang phù hợp
        </Link>
      </div>
    </Layout>
  );
}
