import Layout from '../components/layout/Layout';
import DoctorWorkspace from '../components/doctor/DoctorWorkspace';
import { useAuth } from '../context/AuthContext';
import { useHospital } from '../context/HospitalContext';
import { Stethoscope } from 'lucide-react';

export default function DoctorPage() {
  const { user } = useAuth();
  const { doctors } = useHospital();

  // Find doctor record matching the current user's roomId
  const doctor = doctors.find(d => user?.roomId && d.roomId === user.roomId);
  const roomId = user?.roomId ?? doctor?.roomId;

  if (!roomId) {
    return (
      <Layout pageTitle="Phòng Khám">
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Stethoscope size={48} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">Không tìm thấy thông tin phòng khám</p>
          <p className="text-xs mt-1">Tài khoản chưa được gán phòng</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={`Phòng Khám${doctor ? ` — ${doctor.name}` : ''}`}>
      <DoctorWorkspace roomId={roomId} doctorId={doctor?.id ?? user?.id ?? roomId} />
    </Layout>
  );
}
