"use client";
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import OceanTokenABI from '@/config/abis/OceanToken.json';
import OceanNFTABI from '@/config/abis/OceanNFT.json';
import OceanMarketABI from '@/config/abis/OceanMarket.json';
import contractAddresses from '@/config/contract-addresses.json';

const STUDENT_ID = "202XXXXX"; // Placeholder
const STUDENT_NAME = "My Name"; // Placeholder

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const [tokenContract, setTokenContract] = useState<any>(null);
  const [nftContract, setNftContract] = useState<any>(null);
  const [marketContract, setMarketContract] = useState<any>(null);

  const [octBalance, setOctBalance] = useState("0");
  const [tokenURI, setTokenURI] = useState("");
  const [myNFTs, setMyNFTs] = useState<any[]>([]);
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [sellPrice, setSellPrice] = useState("");
  const [selectedNftToSell, setSelectedNftToSell] = useState<string | null>(null);

  useEffect(() => {
    if ((window as any).ethereum) {
      const p = new ethers.BrowserProvider((window as any).ethereum);
      setProvider(p);
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
    loadContracts(provider, accounts[0]);
  };

  const loadContracts = async (p: any, user: string) => {
    const signer = await p.getSigner();

    // Contracts
    const token = new ethers.Contract(contractAddresses.oceanToken, OceanTokenABI, signer);
    const nft = new ethers.Contract(contractAddresses.oceanNFT, OceanNFTABI, signer);
    const market = new ethers.Contract(contractAddresses.oceanMarket, OceanMarketABI, signer);

    setTokenContract(token);
    setNftContract(nft);
    setMarketContract(market);

    // Initial Data Load
    loadData(token, nft, market, user);
  };

  const loadData = async (token: any, nft: any, market: any, user: string) => {
    // Balance
    const bal = await token.balanceOf(user);
    setOctBalance(ethers.formatEther(bal));

    // My NFTs
    // Simple way: iterate mostly? Or use events? 
    // Since default ERC721 doesn't have "tokensOfOwner", we might need to filter Transfer events or assume low IDs for testing.
    // For this assignment, let's scan first 20 IDs or use events.
    // Better: Scan Transfer events from 0 to 'MyAddress'.
    // Or just fetch ALL minted tokens (totalSupply not in standard ERC721Enumerable unless added).
    // Let's rely on Events "Transfer(address from, address to, uint tokenId)".

    // Fetching events (Generic approach)
    // NOTE: This might be slow on real net, fast on local.
    const filter = nft.filters.Transfer(null, user);
    const events = await nft.queryFilter(filter);
    const myOwned = new Set<string>();
    for (const e of events) {
      // Check current owner (because user might have sold it)
      const tokenId = (e as any).args[2];
      const owner = await nft.ownerOf(tokenId);
      if (owner.toLowerCase() === user.toLowerCase()) {
        myOwned.add(tokenId.toString());
      }
    }

    const loadedNFTs = await Promise.all(Array.from(myOwned).map(async (id) => {
      const uri = await nft.tokenURI(id);
      return { id, uri };
    }));
    setMyNFTs(loadedNFTs);

    // Market Items
    // We need to fetch 'ItemListed' events and check if still active.
    const marketFilter = market.filters.ItemListed();
    const marketEvents = await market.queryFilter(marketFilter);
    const activeListings = [];

    for (const e of marketEvents) {
      const { seller, nftAddress, tokenId, price } = (e as any).args;
      // Check if listing is still valid in contract mapping
      // struct Listing { seller, price }
      // If price == 0, it's deleted (in my contract logic I delete it).
      // Wait, I fetch directly from mapping is better if I have IDs? 
      // But I don't know IDs. So Event -> Check Mapping.
      const listing = await market.listings(nftAddress, tokenId);
      if (listing.price > BigInt(0)) {
        const uri = await nft.tokenURI(tokenId);
        activeListings.push({
          seller: listing.seller,
          price: ethers.formatEther(listing.price),
          tokenId: tokenId.toString(),
          nftAddress,
          uri
        });
      }
    }
    setMarketItems(activeListings);
  };

  const claimTokens = async () => {
    if (!tokenContract) return;
    try {
      const tx = await tokenContract.claimTokens();
      await tx.wait();
      alert("Tokens Claimed!");
      loadData(tokenContract, nftContract, marketContract, account!);
    } catch (e: any) {
      console.error(e);
      alert("Error claiming tokens: " + e.message);
    }
  };

  const mintNFT = async () => {
    if (!nftContract) return;
    try {
      const tx = await nftContract.mint(tokenURI || "https://placehold.co/400"); // Default image if empty
      await tx.wait();
      alert("NFT Minted!");
      setTokenURI("");
      loadData(tokenContract, nftContract, marketContract, account!);
    } catch (e: any) {
      console.error(e);
      alert("Error minting NFT");
    }
  };

  const listNFT = async (tokenId: string) => {
    if (!marketContract || !nftContract) return;
    try {
      const priceWei = ethers.parseEther(sellPrice);

      // Approve Market first
      const approved = await nftContract.getApproved(tokenId);
      const isAllApproved = await nftContract.isApprovedForAll(account, contractAddresses.oceanMarket);

      if (approved !== contractAddresses.oceanMarket && !isAllApproved) {
        const txApp = await nftContract.setApprovalForAll(contractAddresses.oceanMarket, true);
        await txApp.wait();
      }

      const tx = await marketContract.listItem(contractAddresses.oceanNFT, tokenId, priceWei);
      await tx.wait();
      alert("Item Listed!");
      setSelectedNftToSell(null);
      setSellPrice("");
      loadData(tokenContract, nftContract, marketContract, account!);
    } catch (e: any) {
      console.error(e);
      alert("Error listing item: " + e.message);
    }
  };

  const buyNFT = async (nftAddr: string, tokenId: string, price: string) => {
    if (!marketContract || !tokenContract) return;
    try {
      const priceWei = ethers.parseEther(price);

      // Approve Token Spending
      const allowance = await tokenContract.allowance(account, contractAddresses.oceanMarket);
      if (allowance < priceWei) {
        const txApp = await tokenContract.approve(contractAddresses.oceanMarket, priceWei);
        await txApp.wait();
      }

      const tx = await marketContract.buyItem(nftAddr, tokenId);
      await tx.wait();
      alert("Item Bought!");
      loadData(tokenContract, nftContract, marketContract, account!);
    } catch (e: any) {
      console.error(e);
      alert("Error buying item: " + e.message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm p-6 mb-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Ocean NFT Market</h1>

          </div>
          <div>
            {!account ? (
              <button onClick={connectWallet} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                Connect Wallet
              </button>
            ) : (
              <div className="text-right">
                <p className="font-semibold">{account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
                <p className="text-sm text-green-600">{parseFloat(octBalance).toFixed(2)} OCT</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Student ID: 92113669&nbsp;|&nbsp;Name: 서동민
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-12">

        {/* Info Section */}
        <section className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Contract Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <p><strong>Ocean Token (OCT):</strong> {contractAddresses.oceanToken}</p>
            <p><strong>Ocean NFT (ONFT):</strong> {contractAddresses.oceanNFT}</p>
            <p><strong>Ocean Market:</strong> {contractAddresses.oceanMarket}</p>
            <p><strong>Current Owner:</strong> {account || "Not Connected"}</p>
          </div>
        </section>

        {/* 1. Token Drop */}
        <section className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
          <h2 className="text-xl font-bold text-indigo-800 mb-2">1. Token Drop (Faucet)</h2>
          <p className="mb-4 text-indigo-600">Get 1000 Free Ocean Tokens to start trading.</p>
          <button onClick={claimTokens} disabled={!account} className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
            Claim 1000 OCT
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 2. Mint NFT */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">2. Mint NFT</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Image URI (e.g. https://...)"
                className="w-full border p-2 rounded"
                value={tokenURI}
                onChange={(e) => setTokenURI(e.target.value)}
              />
              <button onClick={mintNFT} disabled={!account} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50">
                Mint New NFT
              </button>
            </div>

            <div className="mt-8">
              <h3 className="font-semibold mb-4">My NFTs</h3>
              <div className="grid grid-cols-2 gap-4">
                {myNFTs.map((nft) => (
                  <div key={nft.id} className="border p-4 rounded text-center relative">
                    <p className="text-xs text-gray-500 mb-2">ID: {nft.id}</p>
                    <div className="h-24 bg-gray-100 flex items-center justify-center mb-2 overflow-hidden rounded">
                      {/* Try to show image if valid URL, else text */}
                      {nft.uri.startsWith("http") ? <img src={nft.uri} alt="nft" className="object-cover h-full w-full" /> : <span className="text-xs break-all p-1">{nft.uri}</span>}
                    </div>
                    {selectedNftToSell === nft.id ? (
                      <div className="mt-2">
                        <input
                          type="number"
                          placeholder="Price (OCT)"
                          className="w-full border p-1 mb-1 text-sm"
                          value={sellPrice}
                          onChange={(e) => setSellPrice(e.target.value)}
                        />
                        <div className="flex gap-1">
                          <button onClick={() => listNFT(nft.id)} className="flex-1 bg-blue-500 text-white text-xs py-1 rounded">Confirm</button>
                          <button onClick={() => setSelectedNftToSell(null)} className="flex-1 bg-gray-300 text-xs py-1 rounded">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedNftToSell(nft.id)} className="w-full bg-blue-50 text-blue-600 border border-blue-200 text-xs py-1 rounded hover:bg-blue-100">
                        Sell
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Marketplace */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">3. Marketplace</h2>
            <p className="text-sm text-gray-500 mb-4">Buy NFTs from others using OCT.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {marketItems.map((item) => (
                <div key={`${item.nftAddress}-${item.tokenId}`} className="border p-4 rounded hover:shadow-md transition">
                  <div className="h-32 bg-gray-100 rounded mb-2 overflow-hidden">
                    {item.uri.startsWith("http") ? <img src={item.uri} alt="nft" className="object-cover h-full w-full" /> : <span className="text-xs p-2 block">{item.uri}</span>}
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">{item.price} OCT</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">ID: {item.tokenId}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 truncate">Seller: {item.seller}</p>
                  {item.seller.toLowerCase() === account?.toLowerCase() ? (
                    <button disabled className="w-full bg-gray-200 text-gray-500 py-2 rounded cursor-not-allowed">My Listing</button>
                  ) : (
                    <button onClick={() => buyNFT(item.nftAddress, item.tokenId, item.price)} className="w-full bg-pink-600 text-white py-2 rounded hover:bg-pink-700">
                      Buy Now
                    </button>
                  )}
                </div>
              ))}
              {marketItems.length === 0 && <p className="text-center text-gray-400 py-10">No items listed yet.</p>}
            </div>
          </section>
        </div>

      </div>
    </main>
  );
}
