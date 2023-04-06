import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Flex, Text } from '@chakra-ui/react';
import Link from 'next/link'

const Header = () => {
    return(
        <Flex justifyContent="space-between" alignItems="center" height="10vh"
        width="100%" p="2rem" >
            <Text fontWeight="bold">Logo</Text>
            <Flex width="40%" justifyContent="space-between" alignItems="center">
                <Text><Link href="/">Home</Link></Text>
                <Text><Link href="/Market">Market Place</Link></Text>
                <Text><Link href="/Minting">Minting Place</Link></Text>
                <Text><Link href="/Finance">Finance Your Project</Link></Text>
            </Flex>
            <ConnectButton  chainStatus="icon" />
        </Flex>
    )
}

export default Header;