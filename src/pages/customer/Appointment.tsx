import React from 'react';
import { Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Container } from '@chakra-ui/react';
import Hero from '../../components/customer/HeroSection';
import BookingCTA from '../../components/customer/homecontent/BookingCTA';
import Services from '../../components/customer/homecontent/Services';

const Appointment: React.FC = () => {
  return (
    <Box>
      <Container maxW="7xl">
        <Box position="relative">
          <Hero />
          <Services />
        </Box>

        <Breadcrumb mt={8} mb={6} fontSize="md" color="blue.600">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Đăng ký khám</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <Box mb={20}>
          <BookingCTA />
        </Box>
      </Container>
    </Box>
  );
};

export default Appointment;
