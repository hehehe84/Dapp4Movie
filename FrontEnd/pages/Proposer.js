import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout/Layout';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { Text, Flex, Button, Input, useToast } from '@chakra-ui/react';
import { Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NFTCollectionFactory } from "../public/constants";

export default function Proposer() {

  const { address, isConnected } = useAccount()
  const provider = useProvider()
  const { data: signer } = useSigner()
  const toast = useToast()
  const router = useRouter()

  const [proposers, setProposers] = useState([]);
  const [proposerAddress, setProposerAddress] = useState("");


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

        const filter = contract.filters.ProposerRegistered(null);
        const oldEvents = await contract.queryFilter(filter, 0, 'latest');

        const oldies = oldEvents.map((event) => {
          return event.args.voterAddress;
        });

        setProposers(oldies);


        contract.on("ProposerRegistered", (proposer) => {
          setProposers((prevProposers) => [...prevProposers, proposer]);
        });

        return () => {
          contract.removeAllListeners('ProposerRegistered');
        };

      } catch (err) {
        console.error('Error fetching events:', err);
      }
      
    })();
  }, [provider, signer]);


  const addProposer = async (proposerAddress) => {

    const nftCollectionFactoryAddress = NFTCollectionFactory.addressLocal;
    const contract = new ethers.Contract(
      nftCollectionFactoryAddress,
      NFTCollectionFactory.ABI,
      signer
  );

  try {
    const owner = await contract.owner();
    const signerAddress = await signer.getAddress();
    if (owner !== signerAddress) {
        toast({
          title: 'error',
          description: "You are not the owner!",
          status: 'error',
          duration: 4000,
          isClosable: true,
      })
      return;
    }

    const tx = await contract.addProposer(proposerAddress);
    await tx.wait();
    toast({
      title: 'Congratulations',
      description: "Proposer added successfully!",
      status: 'success',
      duration: 4000,
      isClosable: true,
  })
  } catch (e) {
    toast({
      title: 'error',
      description: "An error occurred while adding proposer.",
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
      <title>DApp4Movies : Admin Panel</title>
      <meta name="description" content="Generated by create next app" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
    <Layout>
      {isConnected ? (
        <div>
          <h1>Admin Panel</h1>
          <br/><br/>
          <div>
            <h1>Add a Proposer :</h1>
              <Input
              placeholder="address"
              value={proposerAddress}
              onChange={(e) => setProposerAddress(e.target.value)}
              />
              <Button colorScheme="blue" onClick={() => addProposer(proposerAddress)}>
                Add Proposer
              </Button>
          </div>
          <br/><br/>
          <div>
            <h2>Proposers List:</h2>
            <div style={{ height: "150px", overflowY: "scroll" }}>
              <ol>
                {proposers && 
                proposers.map((proposer, index) => (
                  <li key={index}>{proposer}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
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