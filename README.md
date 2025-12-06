# Ocean NFT Marketplace

A decentralized NFT Marketplace built with Next.js, Hardhat, and Ethereum (Sepolia Testnet).
This project allows users to claim free tokens using a faucets, mint their own NFTs, and trade them on an open marketplace.

## 🚀 Live Demo
- **Web App**: [https://nft-marketplace-beta-dusky.vercel.app/](https://nft-marketplace-beta-dusky.vercel.app/)

## ✨ Key Features
- **Token Faucet**: Get 1000 OCT tokens for free to verify marketplace functionality.
- **Open Minting**: Create your own unique NFTs by providing an image URI.
- **Marketplace**: List your NFTs for sale and buy others' NFTs using OCT tokens.
- **Wallet Connection**: Seamless integration with MetaMask.

## 🔗 Contract Addresses (Sepolia)
| Contract | Address |
|----------|---------|
| **OceanToken** (ERC20) | `0xd57e3d9EAd7DA97A2ebF552aF1cDD7dEf38574Fb` |
| **OceanNFT** (ERC721) | `0xc3cF7628514f35E5453AaB13BC6CF1fD71a42830` |
| **OceanMarket** | `0x71a0CfecEFA0b8434b4F1996fFDb8Cb83b967b31` |

## 🛠 Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Ethers.js v6
- **Smart Contracts**: Solidity 0.8.20, Hardhat, OpenZeppelin
- **Deployment**: Vercel (Frontend), Sepolia (Blockchain)

## 📦 Installation
1. Clone the repo:
   ```bash
   git clone https://github.com/seosamuel02/nft-marketplace.git
   ```
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../smart-contracts && npm install
   ```
3. Run local development:
   ```bash
   cd frontend && npm run dev
   ```

## 📝 License
This project is open source and available under the MIT License.
