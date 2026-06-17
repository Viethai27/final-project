import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Icon,
  Image,
  Input,
  Radio,
  RadioGroup,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { CalendarDays, CheckCircle2, Clock3, ShieldCheck, Sparkles, Stethoscope, Users } from 'lucide-react';
import { appointmentApi } from '../../../services/appointmentApi';
import { doctorApi } from '../../../services/doctorApi';
import { roomApi } from '../../../services/roomApi';
import { serviceApi } from '../../../services/serviceApi';
import type {
  AppointmentBookingResultDto,
  DoctorDto,
  RoomDto,
  ServiceDto,
} from '../../../services/backend-types';
import BookingCTAImage from '../../../assets/BookingCTA.png';

type GenderValue = 'MALE' | 'FEMALE' | 'OTHER';

type BookingFormState = {
  fullName: string;
  gender: GenderValue;
  dateOfBirth: string;
  phone: string;
  idNumber: string;
  address: string;
  insuranceNumber: string;
  serviceId: string;
  roomId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  note: string;
};

const addDays = (value: Date, days: number) => {
  const copy = new Date(value);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInput = (value: Date) => {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(typeof value === 'string' ? new Date(value) : value);

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long',
  }).format(typeof value === 'string' ? new Date(value) : value);

const ServiceIcon = ({ icon }: { icon: React.ElementType }) => <Icon as={icon} boxSize={4} />;

const BookingCTA: React.FC = () => {
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AppointmentBookingResultDto | null>(null);

  const [form, setForm] = useState<BookingFormState>(() => {
    const tomorrow = addDays(new Date(), 1);
    const nineAm = new Date();
    nineAm.setHours(9, 0, 0, 0);

    return {
      fullName: '',
      gender: 'OTHER',
      dateOfBirth: '',
      phone: '',
      idNumber: '',
      address: '',
      insuranceNumber: '',
      serviceId: '',
      roomId: '',
      doctorId: '',
      appointmentDate: toDateInput(tomorrow),
      appointmentTime: toTimeInput(nineAm),
      note: '',
    };
  });

  useEffect(() => {
    let active = true;

    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      setCatalogError('');

      try {
        const [serviceRes, roomRes, doctorRes] = await Promise.all([
          serviceApi.list({ page: 1, limit: 100, status: 'active', sort: 'asc' }),
          roomApi.list({ page: 1, limit: 100, status: 'active', sort: 'asc' }),
          doctorApi.list({ page: 1, limit: 100, status: 'active', sort: 'asc' }),
        ]);

        if (!active) {
          return;
        }

        setServices((serviceRes.data ?? []).filter(service => service.isActive !== false));
        setRooms((roomRes.data ?? []).filter(room => room.isActive !== false));
        setDoctors((doctorRes.data ?? []).filter(doctor => doctor.isActive !== false));
      } catch (error) {
        if (active) {
          setCatalogError(error instanceof Error ? error.message : 'Không tải được danh mục đặt lịch.');
        }
      } finally {
        if (active) {
          setLoadingCatalogs(false);
        }
      }
    };

    void loadCatalogs();

    return () => {
      active = false;
    };
  }, []);

  const selectedService = useMemo(
    () => services.find(service => service.id === form.serviceId) ?? null,
    [form.serviceId, services],
  );

  const compatibleRooms = useMemo(() => {
    const roomTypeRequired = selectedService?.roomTypeRequired ?? null;

    return rooms
      .filter(room => !roomTypeRequired || room.roomType === roomTypeRequired)
      .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  }, [rooms, selectedService]);

  const selectedRoom = useMemo(
    () => compatibleRooms.find(room => room.id === form.roomId) ?? null,
    [compatibleRooms, form.roomId],
  );

  const compatibleDoctors = useMemo(() => {
    return doctors
      .filter(doctor => {
        if (!selectedRoom) {
          return true;
        }

        const doctorRoomId = doctor.defaultRoomId ?? doctor.defaultRoom?.id ?? null;
        return doctorRoomId === selectedRoom.id;
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  }, [doctors, selectedRoom]);

  useEffect(() => {
    if (!compatibleRooms.length) {
      return;
    }

    if (form.roomId && compatibleRooms.some(room => room.id === form.roomId)) {
      return;
    }

    setForm(current => ({
      ...current,
      roomId: compatibleRooms[0].id,
      doctorId: '',
    }));
  }, [compatibleRooms, form.roomId]);

  useEffect(() => {
    if (!form.doctorId) {
      return;
    }

    if (compatibleDoctors.some(doctor => doctor.id === form.doctorId)) {
      return;
    }

    setForm(current => ({
      ...current,
      doctorId: '',
    }));
  }, [compatibleDoctors, form.doctorId]);

  const updateField = <K extends keyof BookingFormState>(key: K, value: BookingFormState[K]) => {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const resetForm = () => {
    const tomorrow = addDays(new Date(), 1);
    const nineAm = new Date();
    nineAm.setHours(9, 0, 0, 0);

    setForm({
      fullName: '',
      gender: 'OTHER',
      dateOfBirth: '',
      phone: '',
      idNumber: '',
      address: '',
      insuranceNumber: '',
      serviceId: '',
      roomId: '',
      doctorId: '',
      appointmentDate: toDateInput(tomorrow),
      appointmentTime: toTimeInput(nineAm),
      note: '',
    });
    setResult(null);
    setSubmitError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (!form.fullName.trim()) {
      setSubmitError('Vui lòng nhập họ và tên.');
      return;
    }

    if (!form.phone.trim()) {
      setSubmitError('Vui lòng nhập số điện thoại.');
      return;
    }

    if (!form.serviceId) {
      setSubmitError('Vui lòng chọn dịch vụ khám.');
      return;
    }

    if (!form.roomId) {
      setSubmitError('Vui lòng chọn phòng khám.');
      return;
    }

    if (!form.appointmentDate || !form.appointmentTime) {
      setSubmitError('Vui lòng chọn ngày và giờ khám.');
      return;
    }

    const appointmentTime = new Date(`${form.appointmentDate}T${form.appointmentTime}:00`);
    if (Number.isNaN(appointmentTime.getTime())) {
      setSubmitError('Thời gian khám không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await appointmentApi.create({
        fullName: form.fullName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim() || null,
        address: form.address.trim() || null,
        insuranceNumber: form.insuranceNumber.trim() || null,
        serviceId: form.serviceId,
        roomId: form.roomId || null,
        doctorId: form.doctorId || null,
        appointmentTime: appointmentTime.toISOString(),
        note: form.note.trim() || null,
      });

      setResult(response.data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Đặt lịch không thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      mt={24}
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 8 }}
      borderRadius="32px"
      bg="linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(219, 234, 254, 0.85))"
      border="1px solid"
      borderColor="blue.100"
      boxShadow="0 30px 80px rgba(15, 23, 42, 0.08)"
    >
      <Flex direction={{ base: 'column', xl: 'row' }} gap={10} align="stretch">
        <Stack flex="1" spacing={6} maxW={{ xl: '460px' }}>
          <Box>
            <Badge colorScheme="blue" borderRadius="full" px={3} py={1} mb={4} textTransform="none">
              Đặt lịch trực tuyến
            </Badge>
            <Heading fontSize={{ base: '3xl', md: '4xl' }} lineHeight="1.05" color="blue.900">
              Đăng ký khám ngay trên trang chủ, dữ liệu sẽ được ghi thẳng vào hệ thống.
            </Heading>
          </Box>

          <Text fontSize="lg" color="gray.700">
            Hệ thống sẽ lưu hồ sơ bệnh nhân, lịch hẹn, thời gian khám và ghi chú lý do khám để quầy tiếp nhận có thể
            xử lý nhanh hơn khi bạn đến viện.
          </Text>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            <Box bg="white" rounded="2xl" p={4} boxShadow="sm">
              <Flex align="center" gap={3}>
                <Box bg="blue.100" rounded="xl" p={2}>
                  <ServiceIcon icon={ShieldCheck} />
                </Box>
                <Box>
                  <Text fontWeight="700" color="blue.900">
                    Hồ sơ đồng bộ
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Tránh nhập lại dữ liệu nhiều lần.
                  </Text>
                </Box>
              </Flex>
            </Box>
            <Box bg="white" rounded="2xl" p={4} boxShadow="sm">
              <Flex align="center" gap={3}>
                <Box bg="blue.100" rounded="xl" p={2}>
                  <ServiceIcon icon={Clock3} />
                </Box>
                <Box>
                  <Text fontWeight="700" color="blue.900">
                    Chọn giờ khám
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Chủ động chọn ngày giờ phù hợp.
                  </Text>
                </Box>
              </Flex>
            </Box>
            <Box bg="white" rounded="2xl" p={4} boxShadow="sm">
              <Flex align="center" gap={3}>
                <Box bg="blue.100" rounded="xl" p={2}>
                  <ServiceIcon icon={Users} />
                </Box>
                <Box>
                  <Text fontWeight="700" color="blue.900">
                    Kết nối bác sĩ
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Chọn bác sĩ hoặc phòng khám phù hợp.
                  </Text>
                </Box>
              </Flex>
            </Box>
            <Box bg="white" rounded="2xl" p={4} boxShadow="sm">
              <Flex align="center" gap={3}>
                <Box bg="blue.100" rounded="xl" p={2}>
                  <ServiceIcon icon={Sparkles} />
                </Box>
                <Box>
                  <Text fontWeight="700" color="blue.900">
                    Xác nhận tức thì
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Có mã lịch hẹn ngay sau khi gửi.
                  </Text>
                </Box>
              </Flex>
            </Box>
          </SimpleGrid>

          <Box
            overflow="hidden"
            rounded="3xl"
            boxShadow="0 20px 50px rgba(37, 99, 235, 0.15)"
            border="1px solid"
            borderColor="blue.100"
          >
            <Image src={BookingCTAImage} alt="Đăng ký khám trực tuyến" w="100%" h="260px" objectFit="cover" />
          </Box>
        </Stack>

        <Box flex="1.25" bg="white" rounded="3xl" p={{ base: 5, md: 8 }} boxShadow="xl">
          <Stack spacing={6}>
            <Box>
              <Heading fontSize={{ base: '2xl', md: '3xl' }} color="blue.900">
                Phiếu đăng ký khám
              </Heading>
              <Text mt={2} color="gray.600">
                Nhập đầy đủ thông tin để hệ thống tạo hồ sơ bệnh nhân và lịch hẹn trong một lần.
              </Text>
            </Box>

            {catalogError && (
              <Alert status="error" borderRadius="xl">
                <AlertIcon />
                {catalogError}
              </Alert>
            )}

            {submitError && (
              <Alert status="error" borderRadius="xl">
                <AlertIcon />
                {submitError}
              </Alert>
            )}

            {result ? (
              <Box border="1px solid" borderColor="green.100" bg="green.50" rounded="3xl" p={6}>
                <Stack spacing={4}>
                  <Flex align="center" gap={3}>
                    <Box bg="green.100" rounded="full" p={3} color="green.700">
                      <CheckCircle2 size={24} />
                    </Box>
                    <Box>
                      <Heading fontSize="xl" color="green.800">
                        Đặt lịch thành công
                      </Heading>
                      <Text fontSize="sm" color="green.700">
                        Thông tin đã được lưu vào hệ thống.
                      </Text>
                    </Box>
                  </Flex>

                  <Divider borderColor="green.200" />

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.500">
                        Mã bệnh nhân
                      </Text>
                      <Text fontWeight="700" color="gray.900">
                        {result.patient.patientCode}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500">
                        Họ và tên
                      </Text>
                      <Text fontWeight="700" color="gray.900">
                        {result.patient.fullName}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500">
                        Mã lịch hẹn
                      </Text>
                      <Text fontWeight="700" color="gray.900">
                        {result.appointment.appointmentId}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500">
                        Thời gian khám
                      </Text>
                      <Text fontWeight="700" color="gray.900">
                        {formatDateTime(result.appointment.appointmentTime)}
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Box bg="white" rounded="2xl" p={4} border="1px solid" borderColor="green.100">
                    <Stack spacing={2}>
                      <Text fontWeight="700" color="gray.900">
                        {result.appointment.service?.name ?? 'Dịch vụ khám'}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Phòng: {result.appointment.room?.name ?? 'Chưa xác định'} · Bác sĩ:{' '}
                        {result.appointment.doctor?.name ?? 'Chưa chỉ định'}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Ngày khám: {formatDate(result.appointment.appointmentTime)}
                      </Text>
                    </Stack>
                  </Box>

                  <Flex gap={3} wrap="wrap">
                    <Button colorScheme="green" onClick={resetForm}>
                      Đặt lịch khác
                    </Button>
                    <Button variant="outline" onClick={() => setResult(null)}>
                      Xem lại form
                    </Button>
                  </Flex>
                </Stack>
              </Box>
            ) : loadingCatalogs ? (
              <Flex align="center" justify="center" minH="360px">
                <Stack align="center" spacing={3}>
                  <Spinner size="xl" color="blue.500" thickness="3px" />
                  <Text color="gray.600">Đang tải danh mục khám...</Text>
                </Stack>
              </Flex>
            ) : (
              <Box as="form" onSubmit={handleSubmit}>
                <Stack spacing={6}>
                  <Box>
                    <Text fontSize="lg" fontWeight="700" color="blue.900" mb={3}>
                      Thông tin bệnh nhân
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Họ và tên</FormLabel>
                        <Input
                          value={form.fullName}
                          onChange={event => updateField('fullName', event.target.value)}
                          placeholder="Nguyễn Văn A"
                          borderRadius="xl"
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Giới tính</FormLabel>
                        <RadioGroup value={form.gender} onChange={value => updateField('gender', value as GenderValue)}>
                          <Stack direction="row" spacing={4}>
                            <Radio value="MALE">Nam</Radio>
                            <Radio value="FEMALE">Nữ</Radio>
                            <Radio value="OTHER">Khác</Radio>
                          </Stack>
                        </RadioGroup>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Ngày sinh</FormLabel>
                        <Input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={event => updateField('dateOfBirth', event.target.value)}
                          borderRadius="xl"
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Số điện thoại</FormLabel>
                        <Input
                          value={form.phone}
                          onChange={event => updateField('phone', event.target.value)}
                          placeholder="0901234567"
                          borderRadius="xl"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>CCCD / CMND</FormLabel>
                        <Input
                          value={form.idNumber}
                          onChange={event => updateField('idNumber', event.target.value)}
                          placeholder="012345678901"
                          borderRadius="xl"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Số thẻ BHYT</FormLabel>
                        <Input
                          value={form.insuranceNumber}
                          onChange={event => updateField('insuranceNumber', event.target.value)}
                          placeholder="BH123456789"
                          borderRadius="xl"
                        />
                      </FormControl>

                      <FormControl gridColumn={{ base: 'auto', md: '1 / -1' }}>
                        <FormLabel>Địa chỉ</FormLabel>
                        <Input
                          value={form.address}
                          onChange={event => updateField('address', event.target.value)}
                          placeholder="Số nhà, phường, quận, tỉnh"
                          borderRadius="xl"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  <Divider />

                  <Box>
                    <Text fontSize="lg" fontWeight="700" color="blue.900" mb={3}>
                      Thông tin đặt lịch
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Dịch vụ khám</FormLabel>
                        <Select
                          value={form.serviceId}
                          onChange={event =>
                            setForm(current => ({
                              ...current,
                              serviceId: event.target.value,
                              roomId: '',
                              doctorId: '',
                            }))
                          }
                          borderRadius="xl"
                        >
                          <option value="">Chọn dịch vụ</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name} {service.serviceType ? `· ${service.serviceType}` : ''}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Phòng khám</FormLabel>
                        <Select
                          value={form.roomId}
                          onChange={event =>
                            setForm(current => ({
                              ...current,
                              roomId: event.target.value,
                              doctorId: '',
                            }))
                          }
                          borderRadius="xl"
                          isDisabled={compatibleRooms.length === 0}
                        >
                          <option value="">Chọn phòng khám</option>
                          {compatibleRooms.map(room => (
                            <option key={room.id} value={room.id}>
                              {room.name} · {room.department.name}
                            </option>
                          ))}
                        </Select>
                        {form.serviceId && compatibleRooms.length === 0 && (
                          <Text mt={2} fontSize="sm" color="red.500">
                            Không có phòng phù hợp với dịch vụ đã chọn.
                          </Text>
                        )}
                      </FormControl>

                      <FormControl>
                        <FormLabel>Bác sĩ (không bắt buộc)</FormLabel>
                        <Select
                          value={form.doctorId}
                          onChange={event => updateField('doctorId', event.target.value)}
                          borderRadius="xl"
                        >
                          <option value="">Tự động phân công</option>
                          {compatibleDoctors.map(doctor => (
                            <option key={doctor.id} value={doctor.id}>
                              {doctor.name}
                              {doctor.specialty ? ` · ${doctor.specialty}` : ''}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Ngày khám</FormLabel>
                        <Input
                          type="date"
                          value={form.appointmentDate}
                          onChange={event => updateField('appointmentDate', event.target.value)}
                          borderRadius="xl"
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Giờ khám</FormLabel>
                        <Input
                          type="time"
                          value={form.appointmentTime}
                          onChange={event => updateField('appointmentTime', event.target.value)}
                          borderRadius="xl"
                        />
                      </FormControl>

                      <FormControl gridColumn={{ base: 'auto', md: '1 / -1' }}>
                        <FormLabel>Lý do khám / ghi chú</FormLabel>
                        <Textarea
                          value={form.note}
                          onChange={event => updateField('note', event.target.value)}
                          placeholder="Triệu chứng, mong muốn khám, ghi chú thêm..."
                          borderRadius="xl"
                          rows={4}
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  <Alert status="info" borderRadius="xl" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="700">Lưu ý</Text>
                      <Text fontSize="sm">
                        Hệ thống sẽ tự cập nhật hồ sơ theo CCCD hoặc số điện thoại nếu bệnh nhân đã tồn tại.
                      </Text>
                    </Box>
                  </Alert>

                  <Button
                    type="submit"
                    size="lg"
                    colorScheme="blue"
                    borderRadius="full"
                    isLoading={submitting}
                    leftIcon={<Stethoscope size={18} />}
                  >
                    Xác nhận đặt lịch
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      </Flex>
    </Box>
  );
};

export default BookingCTA;
