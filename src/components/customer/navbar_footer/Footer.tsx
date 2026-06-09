import React from "react";
import { Box, Container, Grid, GridItem, Text, Link, HStack, VStack } from "@chakra-ui/react";
import { LogoPamec } from "../../../assets/logo_pamec";

export default function Footer() {
  return (
    <Box bg="linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 109, 219, 0.15) 100%)" py={12} mt={20}>
      <Container maxW="1200px" px={4}>
        {/* Top section: Logo + Info columns */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={8} mb={12} alignItems="start">
          {/* Logo column + Company Info */}
          <GridItem>
            <VStack align="flex-start" spacing={3}>
              <HStack spacing={3} align="center">
                <Box boxSize="50px" display="inline-flex" alignItems="center" flexShrink={0}>
                  <LogoPamec width="50" height="50" />
                </Box>
                <Text fontWeight="bold" fontSize="lg" color="blue.600">
                  PAMEC
                </Text>
              </HStack>
              
              <VStack align="flex-start" spacing={1.5} mt={2}>
                <Text fontWeight="bold" fontSize="xs" color="gray.800">
                  CÔNG TY TNHH BỆNH VIỆN PHÚC AN
                </Text>
                <Text fontSize="xs" color="gray.700">
                  MST/ĐKKD/QĐTL: 0123456789
                </Text>
                <Text fontSize="xs" color="gray.700">
                  Sở kế hoạch và đầu tư thành phố Hà Nội cấp ngày 27/3/2024
                </Text>
                <Text fontSize="xs" color="gray.700">
                  Giấy phép hoạt động cơ sở khám chữa bệnh 003344/HNO - CCHN
                </Text>
                <Text fontSize="xs" color="gray.700">
                  Ngày cấp: 27/11/25
                </Text>
                <Text fontSize="xs" color="gray.700" fontWeight="600" mt={1}>
                  Người chịu trách nhiệm nội dung:
                </Text>
                <Text fontSize="xs" color="gray.700">
                  Ngô Thị Việt Hải
                </Text>
              </VStack>
            </VStack>
          </GridItem>

          {/* Column 2: Về PAMEC */}
          <GridItem>
            <VStack align="flex-start" spacing={3}>
              <Text fontWeight="bold" fontSize="md">Về PAMEC</Text>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Giới thiệu
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Tin tức
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Tuyển dụng
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Liên hệ
              </Link>
            </VStack>
          </GridItem>

          {/* Column 3: Dịch vụ */}
          <GridItem>
            <VStack align="flex-start" spacing={3}>
              <Text fontWeight="bold" fontSize="md">Dịch vụ</Text>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Khám tổng quát
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Nội tiết quân
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Phụ sản
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Khác
              </Link>
            </VStack>
          </GridItem>

          {/* Column 4: Hỗ trợ */}
          <GridItem>
            <VStack align="flex-start" spacing={3}>
              <Text fontWeight="bold" fontSize="md">Hỗ trợ</Text>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Câu hỏi thường gặp
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Chính sách bảo mật
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Điều khoản sử dụng
              </Link>
              <Link href="#" fontSize="sm" color="gray.600" _hover={{ color: "blue.500" }}>
                Liên hệ hỗ trợ
              </Link>
            </VStack>
          </GridItem>
        </Grid>

        <Box my={8} borderTop="1px solid" borderColor="gray.200" />

        {/* Bottom section: Copyright */}
        <Box textAlign="center">
          <Text fontSize="xs" color="gray.500" mb={2}>
            © 2024 PAMEC - Phòng khám đa khoa. Tất cả quyền được bảo lưu.
          </Text>
          <Text fontSize="xs" color="gray.500">
            Địa chỉ: Phường X, Thành phố Y | Điện thoại: 1900 XXXX | Email: info@pamec.vn
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
