import React from "react";
import {
  Flex,
  Box,
  Link,
  Button,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { LogoPamec } from "../../../assets/logo_pamec";

interface NavLinkItem {
  name: string;
  href: string;
}

const NavbarCustomer: React.FC = () => {
  const navHeight = "80px";
  const navOffset = "12px";

  const navLinks: NavLinkItem[] = [
    { name: "Về PAMEC", href: "#top" },
    { name: "Chuyên khoa", href: "#departments" },
    { name: "Tìm bác sĩ", href: "#doctors" },
    { name: "Trang sức khỏe", href: "#reasons" },
    { name: "Hướng dẫn khách hàng", href: "#booking" },
    { name: "Tra cứu lịch sử khám", href: "/visit-tracking" },
  ];

  return (
    <>
      {/* spacer transparent */}
      <Box
        height={`calc(${navHeight} + ${navOffset})`}
        width="100%"
        bg="transparent"
        pointerEvents="none"
      />
      <Flex
        as="nav"
        position="fixed"
        top={navOffset}
        left="4%"
        right="4%"
        maxW="1200px"
        margin="0 auto"
        zIndex={9999}
        bg="rgba(219, 233, 253, 0.61)"
        align="center"
        justify="space-between"
        height={navHeight}
        borderRadius="30px"
        filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))"
        px={6}
        backdropFilter="saturate(180%) blur(6px)"
      >
        {/* Logo - stack vertically */}
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <Box display="inline-flex" alignItems="center" boxSize="40px">
            <LogoPamec width="40px" height="40px" />
          </Box>
          <Box
            as="span"
            fontWeight="700"
            fontSize="sm"
            color="blue.600"
          >
            PAMEC
          </Box>
        </Box>

        {/* Navigation Links - centered */}
        <Flex align="center" gap={6} position="absolute" left="45%" transform="translateX(-50%)">
          {navLinks.map((link) => (
            link.href.startsWith('/') ? (
              <Link
                key={link.name}
                as={RouterLink}
                to={link.href}
                fontSize="sm"
                fontWeight="500"
                color="gray.700"
                _hover={{ color: "blue.600", textDecoration: "none" }}
                whiteSpace="nowrap"
              >
                {link.name}
              </Link>
            ) : (
              <Link
                key={link.name}
                href={link.href}
                fontSize="sm"
                fontWeight="500"
                color="gray.700"
                _hover={{ color: "blue.600", textDecoration: "none" }}
                whiteSpace="nowrap"
              >
                {link.name}
              </Link>
            )
          ))}
        </Flex>

        {/* Action Buttons */}
        <Box display="flex" alignItems="center" gap={3}>
          <Button
            as={RouterLink}
            to="/appointment"
            colorScheme="blue"
            size="md"
            borderRadius="full"
            px={6}
            fontWeight="600"
          >
            Đặt lịch khám
          </Button>
          <Link
            as={RouterLink}
            to="/login"
            fontSize="sm"
            fontWeight="500"
            color="gray.700"
            _hover={{ color: "blue.600", textDecoration: "none" }}
          >
            Login
          </Link>
        </Box>
      </Flex>
    </>
  );
};

export default NavbarCustomer;
