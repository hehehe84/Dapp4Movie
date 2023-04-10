import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout/Layout';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { Text, Flex, Button, Input, useToast } from '@chakra-ui/react';
import { Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { NFTCollectionFactory } from "../public/constants";
import { MyNFT } from '../public/constants';

export default function Finance() {

  const { address, isConnected } = useAccount()
  const provider = useProvider()
  const { data: signer } = useSigner()
  const toast = useToast()
  const router = useRouter()

  const [projectName, setProjectName] = useState("");
  const [launcher, setLauncher] = useState("");
  const [baseURI, setBaseURI] = useState("");
  const [publicPrice, setPublicPrice] = useState("");
  const [maxSupply, setMaxSupply] = useState("");
  const [numbID, setNumbID] = useState("");
  const [royalties, setRoyalties] = useState('');
  const [MyNFTAddress, setMyNFTAddress] = useState([]);
  const [selectedNFTAddress, setSelectedNFTAddress] = useState('');
  const [nftCollections, setNftCollections] = useState([]);
  const [currentRoyalties, setCurrentRoyalties] = useState('');



  const createNFTCollection = async () => {
    
    console.log(NFTCollectionFactory);
    const nftCollectionFactoryAddress = NFTCollectionFactory.addressLocal;
    console.log(nftCollectionFactoryAddress);
    const contract = new ethers.Contract(
      nftCollectionFactoryAddress,
      NFTCollectionFactory.ABI,
      signer
    );
  
    try {
      const tx = await contract.createNFTCollection(
        projectName,
        launcher,
        baseURI,
        ethers.utils.parseEther(publicPrice),
        maxSupply,
        numbID
      );
      await tx.wait();
      toast({
            title: 'Congratulations',
            description: "NFT Collection Created!",
            status: 'success',
            duration: 4000,
            isClosable: true,
        })
    } catch (e) {
      toast({
        title: 'Error',
        description: "Failed to create NFT Collection.",
        status: 'error',
        duration: 4000,
        isClosable: true,
    })
    console.log(e)
    };
  };

  const fetchRoyalties = useCallback(async () => {
    if (!selectedNFTAddress) {
      setCurrentRoyalties('0');
      return;
    }
  
    const contract = new ethers.Contract(
      selectedNFTAddress,
      MyNFT.ABI,
      signer
    );
  
    try {
      const royaltyValue = await contract.getRoyaltyValue();
      setCurrentRoyalties(parseFloat(ethers.utils.formatUnits(royaltyValue, 2)));
      // setCurrentRoyalties(royaltyValue.toNumber() / 100);
    } catch (e) {
      console.log(e);
    }
  },[selectedNFTAddress, signer]);


  useEffect(() => {
    if (!signer || !provider) return;

    fetchRoyalties();

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
  
          const nftCollectionsData = nftCreatedEvents.map((event) => {
            const { args } = event;
            return {
              projectName: args._ProjectName,
              launcher: args.launcher,
              collectionAddress: args._collectionAddress,
              publicPrice: args.publicPrice.toString(),
              maxSupply: args.maxSupply.toString(),
              numbID: args.numbID.toString(),
              timestamp: args._timestamp.toString(),
            };
          });
  
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
  }, [provider, signer, fetchRoyalties]);


  const handleSetRoyalties = async () => {
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
    const contract = new ethers.Contract(
        selectedNFTAddress,
        MyNFT.ABI,
        signer
    );

    try {
        const royaltiesInBasisPoints = Math.round(parseFloat(royalties) * 100);
        const tx = await contract.setRoyalties(address, royaltiesInBasisPoints);
        await tx.wait();
        toast({
            title: 'Congratulations',
            description: "Royalties set!",
            status: 'success',
            duration: 4000,
            isClosable: true,
        });
        setCurrentRoyalties(parseFloat(royalties));
        fetchRoyalties();
    } catch (e) {
        toast({
            title: 'error',
            description: "An error occurred while setting Royalties.",
            status: 'error',
            duration: 4000,
            isClosable: true,
        })
        console.log(e);
    }
    
};
  
  return (
    <>
      <Head>
        <title>DApp4Movies : Finance</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
      {isConnected ? (
        <Tabs variant='soft-rounded' colorScheme='blue' >
          <TabList position='absolute' top='10vh'>
              <Tab>Add a Project</Tab>
              <Tab>Set Royalties</Tab>
          </TabList>
        
          <TabPanels justifyContent="center">
              <TabPanel>
              <Flex direction="column" alignItems="center">
                <h1>Finance your Project !</h1>
                <Input
                  placeholder="Project Name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <Input
                  placeholder="Launcher"
                  value={launcher}
                  onChange={(e) => setLauncher(e.target.value)}
                />
                <Input
                  placeholder="Base URI"
                  value={baseURI}
                  onChange={(e) => setBaseURI(e.target.value)}
                />
                <Input
                  placeholder="Public Price"
                  value={publicPrice}
                  onChange={(e) => setPublicPrice(e.target.value)}
                />
                <Input
                  placeholder="Max Supply"
                  value={maxSupply}
                  onChange={(e) => setMaxSupply(e.target.value)}
                />
                <Input
                  placeholder="Numb ID"
                  value={numbID}
                  onChange={(e) => setNumbID(e.target.value)}
                />
                <Button colorScheme="blue" onClick={createNFTCollection}>
                  Create NFT Collection
                </Button>
              </Flex>
              </TabPanel>

              <TabPanel>
              <div>
                <h1>Set Royalties</h1>
                <select
                  value={selectedNFTAddress}
                  onChange={(e) => {
                    setSelectedNFTAddress(e.target.value);
                    fetchRoyalties();
                  }}
                >
                  <option value="">Choose NFT Collection</option>
                  {nftCollections.map((collection, index) => (
                    <option key={index} value={collection.collectionAddress}>
                      {collection.projectName} - {collection.collectionAddress}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Royalties (in percentage)"
                  value={royalties}
                  min={0.1}
                  max={100}
                  onChange={(e) => setRoyalties(e.target.value)}
                />
                <Button colorScheme="blue" onClick={handleSetRoyalties}>
                  Set Royalties
                </Button>
                <p>Current Royalties: {currentRoyalties}%</p>
              </div>
              </TabPanel>
            </TabPanels>
        </Tabs>
      ) : (
            <Alert status="warning" width="50%">
              <AlertIcon />
              Please, connect your Wallet!
            </Alert>
          )}
      </Layout>
    </>
  );
};