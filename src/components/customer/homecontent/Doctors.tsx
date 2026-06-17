import React from "react";
import { 
  Box, 
  Heading, 
  SimpleGrid, 
  Text, 
  Button, 
  Flex, 
  Stack,
  Icon
} from "@chakra-ui/react";
import { FaUserMd, FaArrowRight } from "react-icons/fa";
import { Link as RouterLink } from "react-router-dom";

interface DoctorItem {
  id: number;
  name: string;
  position: string;
  title: string;
  specialty: string;
  department: string;
}

// Fake data - sẽ thay thế bằng data từ backend sau
const doctorsData: DoctorItem[] = [
  {
    id: 1,
    name: "BS. Phạm Hoài Nam",
    position: "Bác sĩ CKI",
    title: "Chuyên khoa Nội Tổng Quát",
    specialty: "Nội Tổng Quát",
    department: "Khoa Nội Tổng Quát",
  },
  {
    id: 2,
    name: "BS. Nguyễn Thu Hương",
    position: "Bác sĩ CKII",
    title: "Chuyên khoa Tim Mạch",
    specialty: "Tim Mạch",
    department: "Khoa Tim Mạch",
  },
  {
    id: 3,
    name: "BS. Lê Đức Minh",
    position: "Bác sĩ CKI",
    title: "Chuyên khoa Nhi",
    specialty: "Nhi Khoa",
    department: "Khoa Nhi",
  },
  {
    id: 4,
    name: "BS. Hồ Thị Nga",
    position: "Bác sĩ CKII",
    title: "Chuyên khoa Sản Phụ Khoa",
    specialty: "Sản Phụ Khoa",
    department: "Khoa Sản Phụ Khoa",
  },
];

export default function Doctors() {
  return (
    <Box mt={24} px={{ base: 4, md: 8 }}>
      <Heading fontSize={{ base: "2xl", md: "3xl" }} color="#228CCF" mb={2}>
        Đội ngũ Bác sĩ / Chuyên gia
      </Heading>
      <Box h="4px" w={{ base: "180px", md: "240px" }} bg="#1F3B57" mb={10} borderRadius="full" />

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {doctorsData.map((doctor) => (
          <Box
            key={doctor.id}
            bg="#a5d4f353"
            borderRadius="24px"
            p={6}
            boxShadow="md"
            position="relative"
            minH="280px"
          >
            <Flex gap={6} align="start">
              {/* Doctor Image */}
              <Box
                bg="linear-gradient(135deg, #E6F4FF 0%, #C7E7FF 100%)"
                borderRadius="16px"
                flexShrink={0}
                w="150px"
                h="180px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="#228CCF"
                border="1px solid"
                borderColor="blue.100"
              >
                <Icon as={FaUserMd} boxSize={16} aria-label={doctor.name} />
              </Box>

              {/* Doctor Info */}
              <Stack spacing={2} flex={1}>
                <Text fontWeight="bold" fontSize="2xl" color="black">
                  {doctor.name}
                </Text>
                
                <Flex align="center" gap={2}>
                  <Icon as={FaUserMd} boxSize={5} color="gray.700" />
                  <Text fontSize="md" color="black">{doctor.position}</Text>
                </Flex>

                <Text fontSize="md" color="black" pl={7}>
                  {doctor.title}
                </Text>

                <Text fontSize="md" color="black" pl={7}>
                  {doctor.specialty}
                </Text>

                <Text fontSize="md" color="black" pl={7}>
                  {doctor.department}
                </Text>
              </Stack>
            </Flex>

            {/* Appointment Button */}
            <Button
              as={RouterLink}
              to="/appointment"
              leftIcon={<FaArrowRight />}
              colorScheme="blue"
              bg="#2B6CB0"
              color="white"
              borderRadius="full"
              px={6}
              py={5}
              position="absolute"
              bottom={6}
              left={6}
              _hover={{ bg: "#1e4e8c" }}
            >
              Đặt lịch hẹn
            </Button>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
