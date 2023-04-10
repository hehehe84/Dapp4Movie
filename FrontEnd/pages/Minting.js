import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout/Layout';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { Text, Flex, Button, Input, useToast,Image, Box } from '@chakra-ui/react';
import { Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NFTCollectionFactory, MyNFT } from "../public/constants";
// import { IPFSHTTPClient } from 'ipfs-http-client';

export default function Minting() {

    const { address, isConnected } = useAccount()
    const provider = useProvider()
    const { data: signer } = useSigner()
    const toast = useToast()
    const router = useRouter()
    
    const [nftCollections, setNftCollections] = useState([]);
    const [tokenId, setTokenId] = useState("");
    const [mintAmount, setMintAmount] = useState("");
    const [pricePaid, setPricePaid] = useState("")
    const [MyNFTAddress, setMyNFTAddress] = useState([]);
    const [selectedNFTAddress, setSelectedNFTAddress] = useState('');
    const [personalBalance, setPersonalBalance] = useState("0");
  
    async function fetchIPFSJson(ipfsURI) {
      try {
        const gatewayURL = `https://ipfs.io/ipfs/${ipfsURI}/0.json`; // Replace with the correct IPFS gateway URL
        const response = await fetch(gatewayURL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        const imageURL = `${json.image}`;
        return { ...json, imageURL };
      } catch (error) {
        return { noImage: true };
      }
  }

  async function fetchUserBalance(address, contract) {
    try {
      const balance = await contract.balanceOf(address);
      return balance.toString();
    } catch (error) {
      console.error('Error fetching user balance:', error);
      return '0';
    }
  }
  
  async function updatePersonalBalance() {
    const balancePromises = nftCollections.map(async (collection) => {
      const nftContract = new ethers.Contract(
        collection.collectionAddress,
        MyNFT.ABI,
        signer
      );
      return await fetchUserBalance(address, nftContract);
    });
  
    const balances = await Promise.all(balancePromises);
    const totalBalance = balances
      .reduce((acc, curr) => acc.add(ethers.BigNumber.from(curr)), ethers.BigNumber.from(0))
      .toString();
  
    setPersonalBalance(totalBalance);
  }

  async function updateUserBalance(contractAddress) {
    const nftContract = new ethers.Contract(
      contractAddress,
      MyNFT.ABI,
      signer
    );
    const userBalance = await fetchUserBalance(address, nftContract);
    const totalSupply = await nftContract.totalSupply(tokenId);

    setNftCollections((prevCollections) =>
      prevCollections.map((collection) =>
        collection.collectionAddress === contractAddress
          ? { ...collection, balance: userBalance, totalSupply: totalSupply.toString() }
          : collection
      )
    );
  };

    useEffect(() => {
      if (!signer || !provider) return;
  
      (async function () {
        try {
          const nftCollectionFactoryAddress = NFTCollectionFactory.address;
          const contract = new ethers.Contract(
            nftCollectionFactoryAddress,
            NFTCollectionFactory.ABI,
            signer
          );

          const nftCreatedFilter = contract.filters.NFTCollectionCreated(null, null, null, null, null, null, null);
          const nftCreatedEvents = await contract.queryFilter(nftCreatedFilter, 0, 'latest');
  
          [MyNFTAddress, setMyNFTAddress]
          
          const nftCollectionsData = await Promise.all(
            nftCreatedEvents.map(async (event) => {
              const { args } = event;
              const nftContract = new ethers.Contract(
                args._collectionAddress,
                MyNFT.ABI,
                signer
              );
              const tokenURI = await nftContract.viewURI();
              const baseURI = tokenURI.replace(/\/\d+$/, '');
              const metadata = await fetchIPFSJson(tokenURI);
              const totalSupply = await nftContract.totalSupply(args.numbID);
              const userBalance = await fetchUserBalance(nftContract);
              return {
                projectName: args._ProjectName,
                launcher: args.launcher,
                collectionAddress: args._collectionAddress,
                publicPrice: args.publicPrice.toString(),
                maxSupply: args.maxSupply.toString(),
                numbID: args.numbID.toString(),
                timestamp: args._timestamp.toString(),
                baseURI,
                image: metadata.image,
                totalSupply: totalSupply.toString(),
                balance: userBalance,
              };
            })
          );
  
          setNftCollections(nftCollectionsData);
  
          contract.on("NFTCollectionCreated", (_ProjectName, launcher, _collectionAddress, publicPrice, maxSupply, numbID, _timestamp, event) => {
            setNftCollections((prevCollections) => [...prevCollections,
              {
                projectName: _ProjectName,
                launcher,
                collectionAddress: _collectionAddress,
                publicPrice: publicPrice.toString(),
                maxSupply: maxSupply.toString(),
                numbID: numbID.toString(),
                timestamp: _timestamp.toString(),
              },
            ]);
            setMyNFTAddress((prevAddresses) => [...prevAddresses, _collectionAddress]);
          });

          contract.on('Transfer', async (tokenId, amount, buyer, event) => {
            await updateUserBalance(event.address);
            await updatePersonalBalance();
          });
        
          
  
        } catch (err) {
          console.error('Error fetching events:', err);
        }

        updatePersonalBalance();

        return () => {
          contract.removeAllListeners('Transfer');
        };
        
      })();
    }, [provider, signer]);



    useEffect(() => {
      if (mintAmount === '' || !selectedNFTAddress) {
        setPricePaid('0');
        return;
      }
      console.log('mintAmount:', mintAmount);
    
      const selectedCollection = nftCollections.find(
        (collection) => collection.collectionAddress.toLowerCase() === selectedNFTAddress.toLowerCase()
      );
      console.log('selectedNFTAddress:', selectedNFTAddress);
    
      if (!selectedCollection) {
        setPricePaid('');
        return;
      }
      console.log('nftCollections:', nftCollections);
    
      const parsedMintAmount = ethers.BigNumber.from(mintAmount);
      const priceToPay = ethers.BigNumber.from(selectedCollection.publicPrice).mul(parsedMintAmount);
      setPricePaid(ethers.utils.formatEther(priceToPay));
    }, [mintAmount, selectedNFTAddress, nftCollections]);
    

    const mintNFT = async () => {
      if (!selectedNFTAddress) {
        toast({
          title: 'Error',
          description: 'Please select an NFT Collection.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        return;
      }
    
      const parsedTokenId = parseInt(tokenId, 10);
      if (isNaN(parsedTokenId)) {
        toast({
          title: 'Error',
          description: 'Please enter a valid Token ID.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        return;
      }
    
      const parsedMintAmount = ethers.BigNumber.from(mintAmount);
      if (parsedMintAmount.isZero()) {
        toast({
          title: 'Error',
          description: 'Please enter a valid Mint Amount.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        return;
      }
    
      const pricePaidInWei = ethers.utils.parseEther(pricePaid.toString());
    
      const contract = new ethers.Contract(
        selectedNFTAddress,
        MyNFT.ABI,
        signer
      );
    
      try {
        const tx = await contract.publicMint( parsedTokenId, parsedMintAmount,
          { value: pricePaidInWei }
        );
        await tx.wait();
        await updateUserBalance(selectedNFTAddress);
        setPersonalBalance((prevBalance) => {
          const newBalance = ethers.BigNumber.from(prevBalance).add(parsedMintAmount).toString();
          return newBalance;
        });
        toast({
          title: 'Congratulations',
          description: "NFT minted!",
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } catch (e) {
        toast({
          title: 'Error',
          description: "Failed to mint NFT.",
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        console.log(e);
      }
    };
    
    return (
      <>
        <Head>
          <title>DApp4Movies Minting</title>
          <meta name="description" content="Generated by create next app" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Layout height="80vh">
          {isConnected ? (
            <Tabs variant='soft-rounded' colorScheme='blue' >
              <Box>
                <TabList justifyContent="center" alignItems="center" width="100%" Top="0">
                    <Tab>NFT Collections</Tab>
                    <Tab>Mint NFT</Tab>
                </TabList>
              </Box>

              <TabPanels justifyContent="center">
                <TabPanel>
                  <div>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Project Name</Th>
                          <Th>Collection Address</Th>
                          <Th>Public Price (MATIC)</Th>
                          <Th>Id/Collections</Th>
                          <Th>Image</Th>
                          <Th>Minting left</Th>
                          <Th>Personal Balance</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {nftCollections.map((collection, index) => (
                          <Tr key={index}>
                            <Td>{collection.projectName}</Td>
                            <Td>{collection.collectionAddress}</Td>
                            <Td>{(Number(collection.publicPrice) / 1e18).toFixed(4)}</Td>
                            <Td>{collection.numbID}</Td>
                            <Td>
                              {collection.image ? (
                                <Image src={collection.image} alt={collection.projectName} />
                              ) : (
                                "No image available"
                              )}
                            </Td>
                            <Td>{(Number(collection.maxSupply) - Number(collection.totalSupply)).toString()}</Td>
                            <Td>{personalBalance}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </div>
                </TabPanel>
                <TabPanel> 
                  <div>
                    <Flex direction="column" alignItems="center">
                      <select
                        value={selectedNFTAddress}
                        onChange={(e) => setSelectedNFTAddress(e.target.value)}
                      >
                        <option value="">Choose NFT Collection</option>
                        {nftCollections.map((collection, index) => (
                        <option key={index} value={collection.collectionAddress}>
                          {collection.projectName} - {collection.collectionAddress}
                        </option>
                      ))}
                      </select>
                      <Input
                        placeholder="Token ID"
                        value={tokenId}
                        onChange={(e) => setTokenId(e.target.value)}
                      />
                      <Input
                        placeholder="Number of NFTs to buy"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                      />
                      <Input
                        placeholder='Price (in MATIC)'
                        value={pricePaid}
                        readOnly
                      />
                      <Button colorScheme="blue" onClick={mintNFT}>
                        Mint NFT
                      </Button>
                    </Flex>
                  </div>
                </TabPanel> 
              </TabPanels>
          </Tabs>
          ) : (
            <Alert status='warning' width="50%">
              <AlertIcon />
              Please, connect your Wallet!
            </Alert>
          )}
        </Layout>
      </>
  );
};

  