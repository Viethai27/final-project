import React from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Image,
  Stack,
} from "@chakra-ui/react";
import { FaArrowRightLong } from "react-icons/fa6";
import BookingCTAImage from "../../../assets/BookingCTA.png";

const BookingCTA: React.FC = () => {
  return (
    <Box mt={24} px={{ base: 4, md: 8 }}>
      <Flex
        direction={{ base: "column", lg: "row" }}
        align={{ base: "flex-start", lg: "flex-start" }}
        justify="space-between"
        gap={10}
      >
        {/* LEFT CONTENT */}
        <Stack spacing={6} maxW="520px" flex="1">
          {/* Title */}
          <Box>
            <Heading
              fontSize={{ base: "2xl", md: "3xl" }}
              color="#228CCF"
              fontWeight="bold"
              mb={2}
            >
              Đặt lịch khám
            </Heading>
            <Box
              h="4px"
              w={{ base: "120px", md: "160px" }}
              bg="#1F3B57"
              borderRadius="full"
            />
          </Box>

          <Heading
            fontSize={{ base: "2xl", md: "3xl" }}
            lineHeight="1.3"
            color="#095586"
            fontWeight="bold"
          >
            Đặt lịch hẹn gặp các chuyên gia Y tế của chúng tôi ngay hôm nay
          </Heading>

          <Button
            size="lg"
            bg="#2B6CB0"
            color="white"
            rightIcon={<FaArrowRightLong />}
            alignSelf="flex-start"
            px={8}
            py={6}
            borderRadius="full"
            _hover={{ bg: "#1e4e8c" }}
          >
            Đặt lịch khám
          </Button>
        </Stack>

        {/* RIGHT IMAGE */}
        <Box
          flex="1"
          maxW="600px"
          w="100%"
        >
          <Image
            src={BookingCTAImage}
            alt="Đội ngũ bác sĩ"
            w="100%"
            h="auto"
            objectFit="cover"
            borderRadius="16px"
          />
        </Box>
      </Flex>
    </Box>
  );
};

export default BookingCTA;
