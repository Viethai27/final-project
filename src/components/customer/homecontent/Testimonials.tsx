import React from "react";
import {
  Box,
  Heading,
  SimpleGrid,
  Text,
  Avatar,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { FaStar } from "react-icons/fa";

interface TestimonialItem {
  content: string;
}

const testimonials: TestimonialItem[] = [
  {
    content:
      "Mình thật sự biết ơn đội ngũ Y Bác sĩ, trong suốt quá trình điều trị bệnh tim, bác sĩ luôn lắng nghe giải thích rõ ràng vấn đề và đưa phác đồ điều trị phù hợp nhất, trang thiết bị hiện đại, hiện tại tình trạng sức khỏe của mình đã cải thiện rõ rệt.",
  },
  {
    content: "Cơ sở vật chất hiện đại, nhân viên nhiệt tình",
  },
  {
    content: "Bác sĩ tận tình, take care bệnh nhân",
  },
  {
    content:
      "Rất hài lòng, đồ ăn hợp khẩu vị, con mình khám chữa bệnh tại đây, rất thuận tiện",
  },
  {
    content:
      "Bảo vệ đón tiếp khách rất chu đáo, hướng dẫn khách hàng cẩn thận. Đội ngũ y bác sĩ đón tiếp nhiệt tình, xứng đáng 5 sao",
  },
];

const Testimonials: React.FC = () => {
  return (
    <Box mt={24} px={{ base: 4, md: 8 }}>
      {/* Title */}
      <Box mb={10}>
        <Heading
          fontSize={{ base: "2xl", md: "3xl" }}
          color="#228CCF"
          fontWeight="bold"
          mb={2}
        >
          Khách hàng nói gì về chúng tôi
        </Heading>
        <Box
          h="4px"
          w={{ base: "200px", md: "260px" }}
          bg="#1F3B57"
          borderRadius="full"
        />
      </Box>

      {/* Cards */}
      <SimpleGrid
        columns={{ base: 1, sm: 2, md: 3, lg: 5 }}
        spacing={6}
      >
        {testimonials.map((item, index) => (
          <Box
            key={index}
            bg="rgba(150, 216, 244, 0.57)"
            borderRadius="2xl"
            p={6}
            position="relative"
            minH="320px"
            boxShadow="lg"
          >
            {/* Avatar */}
            <Avatar
              size="lg"
              src="/avatar-placeholder.png"
              position="absolute"
              top="-28px"
              left="50%"
              transform="translateX(-50%)"
              bg="blue.100"
            />

            {/* Stars */}
            <HStack justify="center" spacing={1} mt={10} mb={4}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon
                  key={i}
                  as={FaStar}
                  color="blue.500"
                  boxSize={5}
                />
              ))}
            </HStack>

            {/* Content */}
            <Text
              fontSize="sm"
              textAlign="center"
              color="gray.800"
            >
              {item.content}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default Testimonials;
