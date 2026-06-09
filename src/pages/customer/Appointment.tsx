import React from "react";
import { Box, Container, Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@chakra-ui/react";
import AppointmentDetail from "../../components/customer/appointmentcontent/AppointmentDetailForm";
import CustomerInfoForm from "../../components/customer/appointmentcontent/CustomerInfoForm";
import Hero from "../../components/customer/HeroSection";
import Services from "../../components/customer/homecontent/Services";

const Appointment: React.FC = () => {
  return (
    <Box>
      <Container maxW="7xl">
        {/* Hero + Services */}
        <Box position="relative">
          <Hero />
          <Services />
        </Box>

        {/* Breadcrumb */}
        <Breadcrumb mt={8} mb={6} fontSize="md" color="blue.600">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Chuyên khoa</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Khoa Khám tổng quát</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        {/* Section 1: Chi tiết đặt hẹn */}
        <Box mb={12} bg="blue.50" p={10} borderRadius="3xl">
          <AppointmentDetail />
        </Box>

        {/* Section 2: Thông tin khách hàng */}
        <Box mb={20} bg="blue.50" p={10} borderRadius="3xl">
          <CustomerInfoForm />
        </Box>
      </Container>
    </Box>
  );
};

export default Appointment;
