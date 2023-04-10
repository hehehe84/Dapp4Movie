import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Flex, Text, Button } from '@chakra-ui/react';
import Link from 'next/link';
import Image from 'next/image';

const Header = () => {
    return(
        <Flex justifyContent="space-between" alignItems="center" height="10vh"
        width="100%" p="2rem" >
            <div>
                <Image
                    src="/DAppFMbis.png" 
                    width={80}
                    height={80}
                />
            </div>
            <Flex width="30%" justifyContent="space-between" alignItems="center">
                <Button colorScheme='teal' variant='outline'><Link href="/">Home</Link></Button>
                <Button colorScheme='teal' variant='outline'><Link href="/Market">Market Place</Link></Button>
                <Button colorScheme='teal' variant='outline'><Link href="/Minting">Minting Place</Link></Button>
                <Button colorScheme='teal' variant='outline'><Link href="/Finance">Proposer Panels</Link></Button>
                <Button colorScheme='teal' variant='outline'><Link href="/Proposer">Admin Panels</Link></Button>
            </Flex>
            <ConnectButton  chainStatus="icon" />
        </Flex>
    )
}

export default Header;