import React from "react";
import {
  Box,
  Container,
} from "@chakra-ui/react";
import Doctors from "../../components/customer/homecontent/Doctors";
import Departments from "../../components/customer/homecontent/Departments";
import Reasons from "../../components/customer/homecontent/Reasons";
import Services from "../../components/customer/homecontent/Services";
import Hero from "../../components/customer/HeroSection";
import Testimonials from "../../components/customer/homecontent/Testimonials";
import BookingCTA from "../../components/customer/homecontent/BookingCTA";

const HomeCustomer: React.FC = () => {
  return (
    <Box as="section" id="top" pt={{ base: 10, md: 16 }}>
      <Container maxW="7xl">
        <Hero />
        <Box id="services">
          <Services />
        </Box>
        <Box id="reasons">
          <Reasons />
        </Box>
        <Box id="departments">
          <Departments />
        </Box>
        <Box id="doctors">
          <Doctors />
        </Box>
        <Box id="testimonials">
          <Testimonials />
        </Box>
        <Box id="booking">
          <BookingCTA />
        </Box>
      </Container>
    </Box>
  );
};

export default HomeCustomer;
