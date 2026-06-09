import { Box, Image, Heading, Stack } from "@chakra-ui/react";
import homepic from "../../assets/homepic.jpg";

export default function Hero() {
  return (
    <Box mt={10} bg="transparent">
      {/* Hero Heading */}
      <Stack spacing={6} maxW="2xl" mb={8} bg="transparent">
        <Heading
          as="h1"
          fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
          lineHeight="1.15"
          fontWeight="bold"
          color="gray.800"
          bg="transparent"
        >
          {/* Dòng 1 - căn trái */}
          <Box as="div" textAlign="left" ml={20} mt={-39} bg="transparent">
            <Box as="span" color="#095586" whiteSpace="nowrap">CHĂM SÓC </Box>
            <Box as="span" color="#228CCF" whiteSpace="nowrap">BẰNG SỰ </Box>
            <Box as="span" color="#095586" whiteSpace="nowrap">AN LÀNH</Box>
          </Box>
          
          {/* Dòng 2 - thụt vào hoặc căn phải */}
          <Box as="div" textAlign="left" ml={40} bg="transparent">
            <Box as="span" color="#095586" whiteSpace="nowrap">ĐỒNG HÀNH </Box>
            <Box as="span" color="#228CCF" whiteSpace="nowrap">CÙNG </Box>
            <Box as="span" color="#095586" whiteSpace="nowrap">SỨC KHỎE </Box>
            <Box as="span" color="#228CCF" whiteSpace="nowrap">CỦA BẠN</Box>
          </Box>
        </Heading>
      </Stack>

      {/* Hero Image */}
      <Box 
        w="100%" 
        maxW="7xl"
        mx="auto"
        mt={8}
        bg="transparent"
      >
        <Image
          src={homepic}
          w="100%"
          h="auto"
          objectFit="cover"
          alt="hero"
          display="block"
          borderRadius="lg"
        />
      </Box>
    </Box>
  );
}
