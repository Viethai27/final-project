import React from "react";
import { Box, Heading, SimpleGrid, Text, Icon, Stack } from "@chakra-ui/react";
import { IconType } from "react-icons";
import { FaHandHoldingHeart } from "react-icons/fa6";
import { RiTeamLine } from "react-icons/ri";
import { VscServerProcess } from "react-icons/vsc";
import { GiTechnoHeart } from "react-icons/gi";

interface ReasonItem {
  icon: IconType;
  title: string;
  desc: string;
}

const reasons: ReasonItem[] = [
  {
    icon: FaHandHoldingHeart,
    title: "Chăm sóc đặt con người làm trung tâm",
    desc: "PAMEC không chỉ điều trị bệnh lý, mà tập trung vào trải nghiệm và sự an tâm của người bệnh trong suốt quá trình chăm sóc.",
  },
  {
    icon: RiTeamLine,
    title: "Đội ngũ chuyên môn tận tâm và giàu kinh nghiệm",
    desc: "Bác sĩ và nhân viên y tế tại PAMEC làm việc với tinh thần trách nhiệm cao, luôn lắng nghe và đồng hành cùng người bệnh.",
  },
  {
    icon: VscServerProcess,
    title: "Quy trình thăm khám rõ ràng, minh bạch",
    desc: "Mọi bước khám, tư vấn và điều trị đều được giải thích cụ thể, giúp người bệnh chủ động và yên tâm trong quyết định của mình.",
  },
  {
    icon: GiTechnoHeart,
    title: "Không gian y tế hiện đại, thân thiện",
    desc: "PAMEC chú trọng xây dựng môi trường khám chữa bệnh sạch sẽ, nhẹ nhàng, giảm căng thẳng thường gặp khi đến cơ sở y tế.",
  },
];

export default function Reasons() {
  return (
    <Box mt={24} px={{ base: 4, md: 8 }}>
      <Heading fontSize={{ base: "2xl", md: "3xl" }} color="#228CCF" mb={2}>
        Tại sao nên chọn PAMEC ?
      </Heading>
      <Box h="4px" w={{ base: "120px", md: "160px" }} bg="#1F3B57" mb={10} borderRadius="full" />

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        {reasons.map((item) => (
          <Box
            key={item.title}
            bg="#66b6f47d"
            color="black"
            borderRadius="32px"
            p={{ base: 6, md: 8 }}
            textAlign="center"
            minH="360px"
            boxShadow="md"
          >
            <Stack align="center" spacing={4}>
              <Icon as={item.icon} boxSize={16} color="#0F7EC2" />
              <Text fontWeight="bold" fontSize={{ base: "lg", md: "xl" }}>
                {item.title}
              </Text>
              <Text fontSize="md" color="gray.900" lineHeight="tall">
                {item.desc}
              </Text>
            </Stack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
