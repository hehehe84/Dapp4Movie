import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout/Layout';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { Text, Flex, Button, Input, useToast } from '@chakra-ui/react';
import { Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NFTCollectionFactory, MyNFT, MarketPlace } from "../public/constants";
import { fetchIPFSJson, fetchUserBalance, updateUserBalance, updatePersonalBalance } from './Minting'; // Import the required functions

export default function MarketPage() { 

  const { address, isConnected } = useAccount()
  const provider = useProvider()
  const { data: signer } = useSigner()
  const toast = useToast()
  const router = useRouter()

  const [contract, setContract] = useState(null);
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [nftCollections, setNftCollections] = useState([]);
  const [offers, setOffers] = useState([]);

  const deployTx = NFTCollectionFactory.txhash;
  const nftCollectionFactoryAddress = NFTCollectionFactory.address;
    
  useEffect(() => {
    // const marketplaceContractInstance = new ethers.Contract(NFTMarketplace.addressLocal, NFTMarketplace.ABI, signer);
    // setMarketplaceContract(marketplaceContractInstance);
    if (!selectedNFT) return;
  
    const init = async () => {
      const provider = new ethers.providers.Web3Provider(wagmi.getProvider());
      const signer = provider.getSigner();
      const contract = new ethers.Contract(selectedNFT.collectionAddress, MyNFT.ABI, signer); // Use the selected NFT collection's address and ABI
  
      setContract(contract);
    };
    init();
  
    (async () => {
      try {

        const contract = new ethers.Contract(
          nftCollectionFactoryAddress,
          NFTCollectionFactory.ABI,
          signer
        );

        const nftCreatedFilter = contract.filters.NFTCollectionCreated(null, null, null, null, null, null, null);
        const nftCreatedEvents = await contract.queryFilter(nftCreatedFilter, deployTx.blockNumber, 'latest');

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

      fetchOffers();
    })();
  }, [selectedNFT]);
  
  
  async function createOffer() {
      if (!contract || !tokenId || !price || !quantity) return;
      try {
        const transaction = await marketplaceContract.createOffer(tokenId, ethers.utils.parseEther(price), quantity);
        await transaction.wait();
        console.log("Offer created successfully");
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    };
  
    return (
      <Layout>
        <Head>
          <title>NFT Marketplace</title>
        </Head>
        <div>
          <h1>NFT Marketplace</h1><br/><br/>
          <div>
            <h2>Create Offer :</h2>
            <hr/>
            <select onChange={(e) => setSelectedNFT(nftCollections.find((collection) => collection.collectionAddress === e.target.value))}>
              <option value="">Select NFT Collection</option>
              {nftCollections && nftCollections.map((collection) => (
                <option key={collection.collectionAddress} value={collection.collectionAddress}>{collection.projectName}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Token ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
            <input
              type="number"
              placeholder="Price (MATIC)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Button colorScheme="blue" onClick={createOffer}>Create Offer</Button>
          </div>
          <br/><br/><br/>
          <div>
            <h2>List of Offer:</h2>
            <hr/>
            <div style={{ height: "150px", overflowY: "scroll" }}>
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
                      <Tr >
                        <Td></Td>
                        <Td></Td>
                        <Td></Td>
                        <Td></Td>
                        <Td></Td>
                        <Td></Td>
                        <Td></Td>
                      </Tr>
                  </Tbody>
                </Table>
            </div>
          </div><hr/>
          <br/><br/>
          <div>
            <h2>Last transactions :</h2>
            <hr/>
            <div style={{ height: "150px", overflowY: "scroll" }}>
              <ol>
                {/* {proposers && 
                proposers.map((proposer, index) => (
                  <li key={index}>{proposer}</li>
                ))} */}
              </ol>
            </div>
          </div>
        </div>
      </Layout>
    );
  };
