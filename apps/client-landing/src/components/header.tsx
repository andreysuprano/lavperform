import {
  Box,
  Button,
  CloseButton,
  Container,
  Drawer,
  Flex,
  HStack,
  Icon,
  Portal,
  Text,
  VisuallyHidden,
  VStack,
} from "@chakra-ui/react"
import Link from "next/link"
import { Fragment } from "react"
import { LuMenu } from "react-icons/lu"
import { LaundryData } from "@/types/laundry"

interface MobileProps {
  navigation: LaundryData["navigation"]
  branding: LaundryData["branding"]
}

function Mobile({ navigation, branding }: MobileProps) {
  return (
    <Drawer.Root size={{ base: "full", md: "xs" }}>
      <Drawer.Trigger asChild>
        <Button
          display={{ base: "flex", lg: "none" }}
          size="sm"
          variant="outline"
          css={{
            borderColor: "var(--brand-primary)",
            color: "var(--brand-primary)",
          }}
        >
          <Icon boxSize={5}>
            <LuMenu />
          </Icon>
          <VisuallyHidden>Menu mobile</VisuallyHidden>
        </Button>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header borderBottomWidth="1px">
              <Box position="relative" h="50px" maxW="180px">
                <img
                  alt={`Logo ${branding.name}`}
                  src={branding.logo}
                  style={{ 
                    objectFit: 'contain',
                    width: '100%',
                    height: '100%'
                  }}
                />
              </Box>
            </Drawer.Header>
            <Drawer.Body py={6}>
              <VStack as="ul" gap={0} w={"full"} align="stretch">
                <Box
                  as="li"
                  w={"full"}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  <Drawer.CloseTrigger asChild unstyled>
                    <Link href="/">
                      <Text
                        py={4}
                        fontSize="lg"
                        fontWeight="medium"
                        css={{ color: "var(--brand-primary)" }}
                        _hover={{ opacity: 0.8 }}
                      >
                        Início
                      </Text>
                    </Link>
                  </Drawer.CloseTrigger>
                </Box>
                {navigation.map((link) => (
                  <Fragment key={link.label}>
                    <Box
                      as="li"
                      w={"full"}
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                    >
                      <Drawer.CloseTrigger asChild unstyled>
                        <Link href={link.href}>
                          <Text
                            py={4}
                            fontSize="lg"
                            fontWeight="medium"
                            css={{ color: "var(--brand-primary)" }}
                            _hover={{ opacity: 0.8 }}
                          >
                            {link.label}
                          </Text>
                        </Link>
                      </Drawer.CloseTrigger>
                    </Box>
                  </Fragment>
                ))}
              </VStack>
            </Drawer.Body>
            <Drawer.CloseTrigger asChild>
              <CloseButton
                position="absolute"
                top={4}
                right={4}
                size="md"
              />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}

interface HeaderProps {
  branding: LaundryData["branding"]
  navigation: LaundryData["navigation"]
}

export function Header({ branding, navigation }: HeaderProps) {
  return (
    <>
      <Flex
        as="header"
        bg={"white"}
        position="sticky"
        shadow={"md"}
        top="0"
        w="100%"
        zIndex="10"
      >
        <Container maxW="7xl" mx="auto" px={{ base: 4, md: 6, lg: 8 }}>
          <HStack
            gap={5}
            justify="space-between"
            py={{ base: 3, md: 4 }}
            w="full"
          >
            <Link href="#hero">
              <Box position="relative" h="60px" maxW="200px">
                <img
                  alt={`Logo ${branding.name}`}
                  src={branding.logo}
                  style={{ 
                    objectFit: 'contain',
                    width: '100%',
                    height: '100%'
                  }}
                />
              </Box>
            </Link>
            <HStack
              align="center"
              display={{ base: "none", lg: "flex" }}
              gap={4}
            >
              <HStack as="ul" gap={{ base: 4, xl: 6 }}>
                {navigation.map((link) => (
                  <Box
                    key={link.label}
                    as="li"
                    css={{ color: "var(--brand-primary)" }}
                    fontWeight={"semibold"}
                    fontSize={{ base: "sm", xl: "md" }}
                    textTransform={"uppercase"}
                    _hover={{ opacity: 0.7 }}
                    transition="opacity 0.2s"
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Box>
                ))}
              </HStack>
            </HStack>
            <Mobile navigation={navigation} branding={branding} />
          </HStack>
        </Container>
      </Flex>
    </>
  )
}
