import {
  Users, Clock, FlaskConical, CheckCircle2,
  AlertTriangle, TrendingUp, ArrowRightLeft, XCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import type { DashboardStats } from '../../types';

interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  alert?: boolean;
}

function Card({ card }: { card: StatCard }) {
  return (
    <div className={clsx(
      'bg-white rounded-xl border p-4 flex items-start gap-4 transition-all hover:shadow-md',
      card.border,
      card.alert && 'ring-2 ring-red-400'
    )}>
      <div className={clsx('p-2.5 rounded-xl flex-shrink-0', card.bg)}>
        <span className={card.color}>{card.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium leading-none mb-1">{card.label}</p>
        <p className={clsx('text-2xl font-bold leading-none', card.color)}>{card.value}</p>
        {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
      </div>
    </div>
  );
}

interface DashboardCardsProps {
  stats: DashboardStats;
}

export default function DashboardCards({ stats }: DashboardCardsProps) {
  const cards: StatCard[] = [
    {
      label: 'Tổng Bệnh Nhân Hôm Nay',
      value: stats.totalPatientsToday,
      sub: `${stats.completedToday} hoàn tất, ${stats.cancelledToday} hủy`,
      icon: <Users size={20} />,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-100',
    },
    {
      label: 'Đang Chờ Khám',
      value: stats.waitingExam,
      sub: 'Chờ vào phòng khám',
      icon: <Clock size={20} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      alert: stats.waitingExam > 15,
    },
    {
      label: 'Chờ Cận Lâm Sàng',
      value: stats.waitingCLS,
      sub: 'Đang chờ thực hiện CLS',
      icon: <FlaskConical size={20} />,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
    {
      label: 'Chờ Kết Luận',
      value: stats.waitingConclusion,
      sub: 'Sau CLS, chờ bác sĩ kết luận',
      icon: <CheckCircle2 size={20} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Thời Gian Chờ TB',
      value: `${stats.avgWaitMinutes} phút`,
      sub: 'Trung bình toàn bệnh viện',
      icon: <Clock size={20} />,
      color: stats.avgWaitMinutes > 45 ? 'text-red-600' : 'text-teal-600',
      bg: stats.avgWaitMinutes > 45 ? 'bg-red-50' : 'bg-teal-50',
      border: stats.avgWaitMinutes > 45 ? 'border-red-100' : 'border-teal-100',
      alert: stats.avgWaitMinutes > 45,
    },
    {
      label: 'Phòng Quá Tải',
      value: stats.overloadedRooms,
      sub: 'Cần điều chuyển bệnh nhân',
      icon: <AlertTriangle size={20} />,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      alert: stats.overloadedRooms > 0,
    },
    {
      label: 'Tỷ Lệ Sử Dụng Phòng',
      value: `${stats.roomUtilizationRate}%`,
      sub: 'Trung bình các phòng khám',
      icon: <TrendingUp size={20} />,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      label: 'Số Điều Phối Hôm Nay',
      value: stats.dispatchCount,
      sub: 'Tổng lần điều phối thực hiện',
      icon: <ArrowRightLeft size={20} />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card, i) => <Card key={i} card={card} />)}
    </div>
  );
}
