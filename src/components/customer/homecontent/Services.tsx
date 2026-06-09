import React from 'react';
import { 
  Box, 
  Flex, 
  Text, 
  Icon, 
  Stack,
  Container 
} from '@chakra-ui/react';
import { IconType } from "react-icons";
import { IoMdCall } from "react-icons/io";
import { MdCalendarMonth } from "react-icons/md";
import { FaUserDoctor } from "react-icons/fa6";

interface ServiceItemProps {
  icon: IconType;
  title: string;
  description: string;
  isLast?: boolean;
}

// Component con cho từng mục dịch vụ
const ServiceItem: React.FC<ServiceItemProps> = ({ icon, title, description, isLast }) => {
  return (
    <Flex 
      align="center" 
      px={{ base: 4, md: 8 }} 
      py={4} 
      borderRight={isLast ? "none" : "1px solid #CDD1D4"} 
      flex={1}
      transition="all 0.2s"
      _hover={{ bg: "whiteAlpha.500", cursor: "pointer" }}
    >
      <Icon as={icon} boxSize={8} color="blue.500" mr={4} flexShrink={0} />
      <Stack spacing={0}>
        <Text fontWeight="bold" fontSize="lg" color="black">
          {title}
        </Text>
        <Text fontSize="sm" color="gray.500" fontWeight="medium" lineHeight="short">
          {description}
        </Text>
      </Stack>
    </Flex>
  );
};

const ServiceBanner: React.FC = () => {
  return (
    <Container maxW="70%" py={4} ml={20} mt={"-140px"} position="relative" zIndex={10}>
      <Box 
        bg="#E2F6FF"
        borderRadius="40px" 
        overflow="hidden"
        border="1px solid"
        borderColor="#CDD1D4"
        width="100%"
        boxShadow="lg"
      >
        <Flex direction={{ base: "column", md: "row" }} align="stretch">
          <ServiceItem 
            icon={IoMdCall} 
            title="Gọi tổng đài" 
            description="Tư vấn giải đáp các vấn đề của bạn" 
          />
          <ServiceItem 
            icon={MdCalendarMonth} 
            title="Đặt lịch hẹn" 
            description="Đặt lịch hẹn nhanh chóng, tiện lợi" 
          />
          <ServiceItem 
            icon={FaUserDoctor} 
            title="Tìm bác sĩ" 
            description="Tìm thông tin chuyên gia PAMEC nhanh chóng" 
            isLast={true}
          />
        </Flex>
      </Box>
    </Container>
  );
};

export default ServiceBanner;
