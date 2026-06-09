import React, { useState, useRef } from "react";
import {
  Box,
  Text,
  Flex,
  Input,
  Textarea,
  Icon,
  Radio,
  RadioGroup,
  Stack,
} from "@chakra-ui/react";
import { MdCalendarMonth } from "react-icons/md";

const CustomerInfoForm: React.FC = () => {
  const [gender, setGender] = useState<string>("male");
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Box>
      {/* TITLE */}
      <Box mb={10}>
        <Text fontSize="3xl" fontWeight="bold">
          Thông tin khách hàng
        </Text>
        <Box mt={2} w="260px" h="4px" bg="gray.400" />
      </Box>

      {/* ROW 1 */}
      <Flex gap={10} mb={8} flexWrap="wrap">
        {/* Họ và tên */}
        <Box flex="1" minW="300px">
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="blue.700"
            mb={3}
          >
            Họ và tên
          </Text>

          <Flex align="center" gap={6}>
            <Input
              size="lg"
              placeholder="Nhập họ và tên"
              borderRadius="full"
              border="3px solid"
              borderColor="blue.300"
              bg="blue.50"
              _focus={{ borderColor: "blue.500" }}
            />

            {/* Gender */}
            <RadioGroup value={gender} onChange={setGender}>
              <Stack direction="row" spacing={6}>
                <Radio value="male" colorScheme="blue">
                  Nam
                </Radio>
                <Radio value="female" colorScheme="blue">
                  Nữ
                </Radio>
              </Stack>
            </RadioGroup>
          </Flex>
        </Box>

        {/* Ngày sinh */}
        <Box flex="1" minW="300px">
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="blue.700"
            mb={3}
          >
            Ngày tháng năm sinh
          </Text>

          <Box position="relative">
            <Input
              ref={dateInputRef}
              size="lg"
              type="date"
              borderRadius="full"
              border="3px solid"
              borderColor="blue.300"
              bg="blue.50"
              pr={12}
              _focus={{ borderColor: "blue.500" }}
              sx={{
                "&::-webkit-calendar-picker-indicator": {
                  display: "none"
                }
              }}
            />
            <Icon
              as={MdCalendarMonth}
              position="absolute"
              right={4}
              top="50%"
              transform="translateY(-50%)"
              color="blue.500"
              boxSize={6}
              cursor="pointer"
              onClick={() => dateInputRef.current?.showPicker()}
            />
          </Box>
        </Box>
      </Flex>

      {/* ROW 2 */}
      <Flex gap={10} mb={8} flexWrap="wrap">
        {/* Phone */}
        <Box flex="1" minW="300px">
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="blue.700"
            mb={3}
          >
            Số điện thoại
          </Text>
          <Input
            size="lg"
            placeholder="Nhập số điện thoại"
            borderRadius="full"
            border="3px solid"
            borderColor="blue.300"
            bg="blue.50"
            _focus={{ borderColor: "blue.500" }}
          />
        </Box>

        {/* Email */}
        <Box flex="1" minW="300px">
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="blue.700"
            mb={3}
          >
            Email
          </Text>
          <Input
            size="lg"
            placeholder="Nhập email"
            borderRadius="full"
            border="3px solid"
            borderColor="blue.300"
            bg="blue.50"
            _focus={{ borderColor: "blue.500" }}
          />
        </Box>
      </Flex>

      {/* Reason */}
      <Box>
        <Text
          fontSize="2xl"
          fontWeight="bold"
          color="blue.700"
          mb={3}
        >
          Lý do khám
        </Text>
        <Textarea
          placeholder="Nhập lý do khám"
          minH="140px"
          resize="none"
          borderRadius="2xl"
          border="3px solid"
          borderColor="blue.300"
          bg="blue.50"
          _focus={{ borderColor: "blue.500" }}
        />
      </Box>
    </Box>
  );
};

export default CustomerInfoForm;
