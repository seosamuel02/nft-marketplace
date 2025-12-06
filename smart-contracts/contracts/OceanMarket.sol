// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OceanMarket is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
    }

    // nftContract -> tokenId -> Listing
    mapping(address => mapping(uint256 => Listing)) public listings;
    IERC20 public paymentToken;

    event ItemListed(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemBought(address indexed buyer, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);

    constructor(address _paymentToken) {
        paymentToken = IERC20(_paymentToken);
    }

    // List an NFT for sale
    // Seller must have approved this contract to transfer the NFT
    function listItem(address nftAddress, uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be greater than 0");
        
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(nft.isApprovedForAll(msg.sender, address(this)) || nft.getApproved(tokenId) == address(this), "Market not approved");

        listings[nftAddress][tokenId] = Listing(msg.sender, price);

        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    // Buy a listed NFT
    function buyItem(address nftAddress, uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[nftAddress][tokenId];
        require(listing.price > 0, "Item not listed");
        require(listing.seller != msg.sender, "Cannot buy your own item"); // Basic check

        // Check allowance and balance
        require(paymentToken.balanceOf(msg.sender) >= listing.price, "Insufficient balance");
        require(paymentToken.allowance(msg.sender, address(this)) >= listing.price, "Insufficient allowance");

        // Delete listing before transfer to prevent reentrancy (though Guard handles it)
        delete listings[nftAddress][tokenId];

        // Transfer Token from Buyer to Seller
        paymentToken.transferFrom(msg.sender, listing.seller, listing.price);

        // Transfer NFT from Seller to Buyer
        IERC721(nftAddress).safeTransferFrom(listing.seller, msg.sender, tokenId);

        emit ItemBought(msg.sender, nftAddress, tokenId, listing.price);
    }

    // Cancel a listing
    function cancelListing(address nftAddress, uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[nftAddress][tokenId];
        require(listing.seller == msg.sender, "Not the seller");

        delete listings[nftAddress][tokenId];
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }
}
