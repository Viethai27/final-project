import React, { useState } from "react";
import {
  Box,
  Text,
  Flex,
  SimpleGrid,
  Input,
  Icon,
  Button,
} from "@chakra-ui/react";
import { MdCalendarMonth } from "react-icons/md";

interface DateCardProps {
  date?: string;
  day?: string;
  active?: boolean;
  onClick?: () => void;
  isOther?: boolean;
}

const DateCard: React.FC<DateCardProps> = ({ date, day, active, onClick, isOther }) => (
  <Box
    onClick={onClick}
    cursor="pointer"
    borderRadius="2xl"
    border="3px solid"
    borderColor={active ? "blue.500" : "blue.300"}
    bg={active ? "blue.100" : "blue.50"}
    px={6}
    py={5}
    minW="120px"
    textAlign="center"
    transition="all 0.2s"
    _hover={{ borderColor: "blue.500" }}
  >
    {isOther ? (
      <>
        <Icon as={MdCalendarMonth} boxSize={8} color="blue.500" mb={2} />
        <Text fontWeight="bold">Ngày khác</Text>
      </>
    ) : (
      <>
        <Text fontSize="xl" fontWeight="bold">
          {date}
        </Text>
        <Text color="gray.500">{day}</Text>
      </>
    )}
  </Box>
);

interface SessionButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const SessionButton: React.FC<SessionButtonProps> = ({ label, active, onClick }) => (
  <Button
    onClick={onClick}
    borderRadius="full"
    px={10}
    py={6}
    fontSize="lg"
    border="3px solid"
    borderColor={active ? "blue.500" : "blue.300"}
    bg={active ? "blue.100" : "blue.50"}
    _hover={{ borderColor: "blue.500" }}
  >
    {label}
  </Button>
);

interface DateItem {
  id: number;
  date: string;
  day: string;
}

/* ---------- Main Component ---------- */

const AppointmentDetailForm: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<number>(1);
  const [session, setSession] = useState<string>("morning");

  const dates: DateItem[] = [
    { id: 1, date: "24/12", day: "Thứ 4" },
    { id: 2, date: "25/12", day: "Thứ 5" },
    { id: 3, date: "26/12", day: "Thứ 6" },
  ];

  return (
    <Box>
      {/* TITLE */}
      <Box mb={10}>
        <Text fontSize="3xl" fontWeight="bold">
          Nội dung chi tiết đặt hẹn
        </Text>
        <Box mt={2} w="280px" h="4px" bg="gray.400" />
      </Box>

      <Flex gap={20} align="flex-start" flexWrap="wrap">
        {/* LEFT COLUMN */}
        <Box flex="1" minW="320px">
          {/* Chuyên khoa */}
          <Box mb={8}>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color="blue.700"
              mb={3}
            >
              Chuyên khoa
            </Text>
            <Input
              size="lg"
              placeholder="Chọn chuyên khoa"
              borderRadius="full"
              border="3px solid"
              borderColor="blue.300"
              bg="blue.50"
              _focus={{ borderColor: "blue.500" }}
            />
          </Box>

          {/* Bác sĩ */}
          <Box mb={8}>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color="blue.700"
              mb={3}
            >
              Bác sĩ
            </Text>
            <Input
              size="lg"
              placeholder="Chọn bác sĩ"
              borderRadius="full"
              border="3px solid"
              borderColor="blue.300"
              bg="blue.50"
              _focus={{ borderColor: "blue.500" }}
            />
          </Box>
        </Box>

        {/* RIGHT COLUMN */}
        <Box flex="1.2" minW="360px">
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="blue.700"
            mb={6}
          >
            Thời gian khám
          </Text>

          {/* Date picker */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} mb={10}>
            {dates.map((d) => (
              <DateCard
                key={d.id}
                date={d.date}
                day={d.day}
                active={selectedDate === d.id}
                onClick={() => setSelectedDate(d.id)}
              />
            ))}
            <DateCard isOther />
          </SimpleGrid>

          {/* Session */}
          <Flex gap={6}>
            <SessionButton
              label="Sáng"
              active={session === "morning"}
              onClick={() => setSession("morning")}
            />
            <SessionButton
              label="Chiều"
              active={session === "afternoon"}
              onClick={() => setSession("afternoon")}
            />
          </Flex>
        </Box>
      </Flex>

      {/* NOTE */}
      <Text mt={12} fontSize="md">
        *Lưu ý: Tổng đài viên PAMEC sẽ gọi lại cho quý khách để xác nhận
        thông tin thời gian dựa theo đăng ký và điều chỉnh nếu cần thiết.
      </Text>
    </Box>
  );
};

export default AppointmentDetailForm;
