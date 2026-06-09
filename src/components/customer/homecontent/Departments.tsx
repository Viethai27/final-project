import React from "react";
import { Box, Heading, SimpleGrid, Text, Stack } from "@chakra-ui/react";

interface DepartmentItem {
  name: string;
  description: string;
}

const departments: DepartmentItem[] = [
  {
    name: "Khám tổng quát",
    description: "Lắng nghe và chăm sóc sức khỏe bạn ngay từ bước đầu.",
  },
  {
    name: "Nội tổng quát",
    description: "Theo dõi và điều trị tận tâm vì sức khỏe lâu dài.",
  },
  {
    name: "Ngoại tổng quát",
    description: "Can thiệp an toàn, rõ ràng và đúng thời điểm.",
  },
  {
    name: "Tim mạch",
    description: "Chăm sóc trái tim bạn một cách bền vững.",
  },
  {
    name: "Phụ sản",
    description: "Đồng hành nhẹ nhàng cùng sức khỏe phụ nữ.",
  },
  {
    name: "Nhi",
    description: "Ân cần chăm sóc để trẻ phát triển khỏe mạnh.",
  },
  {
    name: "Cấp cứu",
    description: "Sẵn sàng xử trí nhanh trong mọi tình huống.",
  },
];

export default function Departments() {
  return (
    <Box mt={24}>
      <Box px={{ base: 4, md: 8 }}>
        <Heading fontSize={{ base: "2xl", md: "3xl" }} color="#228CCF" mb={2}>
          Các khoa chuyên môn chăm sóc sức khỏe
        </Heading>
        <Box h="4px" w={{ base: "200px", md: "280px" }} bg="#1F3B57" mb={10} borderRadius="full" />
      </Box>

      {/* Hàng 1: 4 khoa */}
      <Box px={{ base: 4, md: 8 }}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={6} mb={6}>
          {departments.slice(0, 4).map((dept) => (
            <Box
              key={dept.name}
              bg="#2899f041"
              p={8}
              borderRadius="32px"
              textAlign="center"
              minH="180px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Stack spacing={3}>
                <Text fontWeight="bold" fontSize="xl" color="black">
                  {dept.name}
                </Text>
                <Text fontSize="md" color="gray.900" lineHeight="tall">
                  {dept.description}
                </Text>
              </Stack>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      {/* Hàng 2: 3 khoa - căn giữa */}
      <Box px={{ base: 4, md: 8 }}>
        <SimpleGrid 
          columns={{ base: 1, sm: 2, md: 3 }} 
          spacing={6}
          maxW={{ base: "100%", md: "75%" }}
          mx="auto"
        >
          {departments.slice(4, 7).map((dept) => (
            <Box
              key={dept.name}
              bg="#2899f041"
              p={8}
              borderRadius="32px"
              textAlign="center"
              minH="180px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Stack spacing={3}>
                <Text fontWeight="bold" fontSize="xl" color="black">
                  {dept.name}
                </Text>
                <Text fontSize="md" color="gray.900" lineHeight="tall">
                  {dept.description}
                </Text>
              </Stack>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}
