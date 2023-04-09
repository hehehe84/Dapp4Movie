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
    const [imageUrls, setImageUrls] = useState([]);
  
    async function fetchIPFSJson(ipfsURI) {
      try {
        console.log('fetchIPFSJson called with IPFS URI:', ipfsURI);
        const gatewayURL = `https://ipfs.io/ipfs/${ipfsURI}/0.json`; // Replace with the correct IPFS gateway URL
        const response = await fetch(gatewayURL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        const imageURL = `${json.image}`;
        console.log(imageURL);
        return { ...json, imageURL };
      } catch (error) {
        return { noImage: true };
      }
  }
    


  async function updateMintingLeft(collectionAddress, newTotalSupply) {
    setNftCollections((prevCollections) =>
    prevCollections.map((collection) =>
      collection.collectionAddress === collectionAddress
        ? { ...collection, totalSupply: newTotalSupply.toString() }
        : collection
      )
    );
  };

    useEffect(() => {
      if (!signer || !provider) return;
  
      (async function () {
        try {
          const nftCollectionFactoryAddress = NFTCollectionFactory.addressLocal;
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
              console.log(metadata.image);
              const totalSupply = await nftContract.totalSupply(args.numbID);
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
  
        } catch (err) {
          console.error('Error fetching events:', err);
        }
        
      })();
    }, [provider, signer]);

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

       // Convert mintAmount to a BigNumber
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
        const tx = await contract.publicMint(
          parsedTokenId,
          parsedMintAmount,
          {value: pricePaidInWei}
        );
        await tx.wait();
        const updatedTotalSupply = await nftContract.totalSupply();
        updateMintingLeft(selectedNFTAddress, updatedTotalSupply);
        toast({
            title: 'Congratulations',
            description: "NFT minted!",
            status: 'success',
            duration: 4000,
            isClosable: true,
        })
      } catch (e) {
        toast({
            title: 'Error',
            description: "Failed to mint NFT.",
            status: 'error',
            duration: 4000,
            isClosable: true,
        })
        console.log(e)
      };
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
              <Box Top="0" Position="">
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
                        onChange={(e) => setPricePaid(e.target.value)}
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

  