import React from "react";
import { Box, Portal } from "@chakra-ui/react";
import NavbarCustomer from "../../components/customer/navbar_footer/NavbarCustomer";
import Footer from "../../components/customer/navbar_footer/Footer";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  return (
    <Box as="main" position="relative" minH="100vh" w="100%" overflowX="hidden">
      {/* Gradient background top-right */}
      <Portal>
        <Box
          position="absolute"
          top="-40vh"
          right="-20vw"
          width="140vw"
          height="140vh"
          bgGradient="radial(circle at 100% 0%, rgba(30, 109, 219, 0.45) 0%, rgba(34, 123, 248, 0.25) 30%, rgba(49, 131, 246, 0.12) 55%, rgba(60,136,243,0.04) 75%, transparent 100%)"
          filter="blur(80px)"
          zIndex={0}
          pointerEvents="none"
        />
      </Portal>

      {/* Gradient background middle-left - tăng kích thước lại */}
      <Portal>
        <Box
          position="absolute"
          top="50%"
          left="-30vw"
          transform="translateY(-50%)"
          width="120vw"
          height="120vh"
          bgGradient="radial(circle at 0% 50%, rgba(34, 123, 248, 0.35) 0%, rgba(30, 109, 219, 0.20) 25%, rgba(49, 131, 246, 0.10) 50%, transparent 100%)"
          filter="blur(80px)"
          zIndex={0}
          pointerEvents="none"
        />
      </Portal>

      {/* Content - đặt trên gradient */}
      <Box position="relative" zIndex={1}>
        <NavbarCustomer />
        <Box as="section" w="100%" display="flex" flexDirection="column">
          {children}
        </Box>
      </Box>
      
      <Footer />
    </Box>
  );
};

export default CustomerLayout;
