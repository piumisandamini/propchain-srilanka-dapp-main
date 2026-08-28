// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RealEstateAsset
 * @notice PropChain decentralized digital asset registry and marketplace.
 *
 * Features:
 * - Register and mint real-estate assets as ERC-721 tokens
 * - List and cancel assets for sale
 * - Purchase assets using ETH
 * - Directly transfer asset ownership
 * - Maintain immutable ownership history
 * - Track total assets and ownership transactions
 * - Retrieve assets owned by a wallet
 * - Retrieve top asset holders
 *
 * @dev This contract represents digital ownership of property-related assets.
 * It does not itself establish legal ownership of physical land.
 */
contract RealEstateAsset is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    Ownable,
    ReentrancyGuard
{
    // =============================================================
    //                         STATE
    // =============================================================

    uint256 private _nextTokenId;

    /**
     * @notice Counts asset creations and ownership-changing transactions.
     */
    uint256 public totalTransactions;

    struct Property {
        uint256 id;
        string location;
        uint256 floorArea;
        string propertyType;
        uint256 registeredValue;
        string documentHash;
        uint256 price; // Sale price in wei. 0 means not listed.
        bool isForSale;
        address payable seller;
    }

    struct OwnershipRecord {
        address from;
        address to;
        uint256 price;
        uint256 timestamp;
    }

    mapping(uint256 => Property) private _properties;

    mapping(uint256 => OwnershipRecord[]) private _ownershipHistory;

    /**
     * Used by _update() to attach a sale price to an ownership-history
     * record when ownership changes.
     */
    mapping(uint256 => uint256) private _pendingHistoryPrice;

    /**
     * Maintains addresses that have owned at least one asset.
     * This allows the frontend to calculate/display top holders.
     */
    address[] private _knownHolders;

    mapping(address => bool) private _holderKnown;

    // =============================================================
    //                         EVENTS
    // =============================================================

    event AssetRegistered(
        uint256 indexed tokenId,
        address indexed owner,
        string location,
        uint256 price
    );

    event AssetListed(
        uint256 indexed tokenId,
        uint256 price,
        address indexed seller
    );

    event AssetDelisted(
        uint256 indexed tokenId,
        address indexed owner
    );

    event AssetPurchased(
        uint256 indexed tokenId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 price
    );

    event AssetTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    // =============================================================
    //                       CONSTRUCTOR
    // =============================================================

    constructor(address initialOwner)
        ERC721("PropChain Real Estate Asset", "PREA")
        Ownable(initialOwner == address(0) ? msg.sender : initialOwner)
    {}

    // =============================================================
    //                 1. REGISTER / MINT ASSET
    // =============================================================

    /**
     * @notice Registers a new property and mints an ERC-721 token.
     *
     * @param location Property location
     * @param floorArea Floor area of the property
     * @param propertyType Type of property
     * @param registeredValue Reference/registered property value
     * @param documentHash Hash/reference for supporting documentation
     * @param uri Metadata URI for the NFT
     * @param priceEthWei Marketplace sale price in wei
     * @param listForSale Whether the asset should immediately be listed
     */
    function registerAsset(
        string memory location,
        uint256 floorArea,
        string memory propertyType,
        uint256 registeredValue,
        string memory documentHash,
        string memory uri,
        uint256 priceEthWei,
        bool listForSale
    ) external returns (uint256) {
        require(bytes(location).length > 0, "Location is required");
        require(floorArea > 0, "Floor area must be greater than zero");
        require(
            bytes(propertyType).length > 0,
            "Property type is required"
        );
        require(
            registeredValue > 0,
            "Registered value must be greater than zero"
        );
        require(
            bytes(documentHash).length > 0,
            "Document hash is required"
        );
        require(bytes(uri).length > 0, "Token URI is required");

        if (listForSale) {
            require(
                priceEthWei > 0,
                "Listed asset must have a sale price"
            );
        }

        address creator = msg.sender;

        uint256 newTokenId = ++_nextTokenId;

        /*
         * Set the value before minting because _safeMint() eventually
         * calls _update(), which records the initial ownership entry.
         */
        _pendingHistoryPrice[newTokenId] =
            listForSale ? priceEthWei : 0;

        _safeMint(creator, newTokenId);

        _setTokenURI(newTokenId, uri);

        _properties[newTokenId] = Property({
            id: newTokenId,
            location: location,
            floorArea: floorArea,
            propertyType: propertyType,
            registeredValue: registeredValue,
            documentHash: documentHash,
            price: listForSale ? priceEthWei : 0,
            isForSale: listForSale,
            seller: listForSale
                ? payable(creator)
                : payable(address(0))
        });

        emit AssetRegistered(
            newTokenId,
            creator,
            location,
            listForSale ? priceEthWei : 0
        );

        if (listForSale) {
            emit AssetListed(
                newTokenId,
                priceEthWei,
                creator
            );
        }

        return newTokenId;
    }

    // =============================================================
    //                     2. SELL / LIST ASSET
    // =============================================================

    /**
     * @notice Lists an owned asset for sale.
     */
    function listAssetForSale(
        uint256 tokenId,
        uint256 price
    ) external {
        require(
            ownerOf(tokenId) == msg.sender,
            "Only asset owner can list"
        );

        require(
            price > 0,
            "Price must be greater than zero"
        );

        Property storage property = _properties[tokenId];

        property.price = price;
        property.isForSale = true;
        property.seller = payable(msg.sender);

        emit AssetListed(
            tokenId,
            price,
            msg.sender
        );
    }

    /**
     * @notice Removes an owned asset from the marketplace.
     */
    function cancelListing(
        uint256 tokenId
    ) external {
        require(
            ownerOf(tokenId) == msg.sender,
            "Only asset owner can cancel listing"
        );

        Property storage property = _properties[tokenId];

        require(
            property.isForSale,
            "Asset is not currently listed"
        );

        property.price = 0;
        property.isForSale = false;
        property.seller = payable(address(0));

        emit AssetDelisted(
            tokenId,
            msg.sender
        );
    }

    // =============================================================
    //                        3. BUY ASSET
    // =============================================================

    /**
     * @notice Purchases an asset currently listed for sale.
     *
     * @dev nonReentrant prevents re-entrancy through the seller
     * payment call.
     */
    function buyAsset(
        uint256 tokenId
    ) external payable nonReentrant {
        address previousOwner = ownerOf(tokenId);

        Property storage property = _properties[tokenId];

        require(
            property.isForSale,
            "Asset is not for sale"
        );

        require(
            previousOwner != msg.sender,
            "Owner cannot buy own asset"
        );

        require(
            property.seller == previousOwner,
            "Listing owner mismatch"
        );

        uint256 salePrice = property.price;

        require(
            salePrice > 0,
            "Invalid sale price"
        );

        /*
         * Exact payment is used to avoid accidental overpayment.
         */
        require(
            msg.value == salePrice,
            "Incorrect ETH amount"
        );

        /*
         * Provide the price to _update(), which records the
         * ownership history automatically.
         */
        _pendingHistoryPrice[tokenId] = salePrice;

        /*
         * Transfer ownership before sending ETH.
         * If the payment later fails, the entire transaction reverts,
         * including this token transfer.
         */
        _safeTransfer(
            previousOwner,
            msg.sender,
            tokenId,
            ""
        );

        /*
         * Checks-Effects-Interactions + nonReentrant.
         */
        (bool success, ) = payable(previousOwner).call{
            value: salePrice
        }("");

        require(
            success,
            "ETH transfer to seller failed"
        );

        emit AssetPurchased(
            tokenId,
            previousOwner,
            msg.sender,
            salePrice
        );
    }

    // =============================================================
    //                      4. TRANSFER ASSET
    // =============================================================

    /**
     * @notice Direct peer-to-peer transfer by the current owner.
     */
    function transferAsset(
        address to,
        uint256 tokenId
    ) external {
        address previousOwner = ownerOf(tokenId);

        require(
            previousOwner == msg.sender,
            "Caller is not token owner"
        );

        require(
            to != address(0),
            "Cannot transfer to zero address"
        );

        require(
            to != previousOwner,
            "Cannot transfer asset to yourself"
        );

        _pendingHistoryPrice[tokenId] = 0;

        _safeTransfer(
            previousOwner,
            to,
            tokenId,
            ""
        );

        emit AssetTransferred(
            tokenId,
            previousOwner,
            to
        );
    }

    // =============================================================
    //                      5. VIEW ASSET DATA
    // =============================================================

    /**
     * @notice Returns information about one registered asset.
     */
    function getAsset(
        uint256 tokenId
    ) external view returns (Property memory) {
        require(
            _ownerOf(tokenId) != address(0),
            "Asset does not exist"
        );

        return _properties[tokenId];
    }

    /**
     * @notice Returns the complete ownership history for an asset.
     */
    function getOwnershipHistory(
        uint256 tokenId
    )
        external
        view
        returns (OwnershipRecord[] memory)
    {
        require(
            _ownerOf(tokenId) != address(0),
            "Asset does not exist"
        );

        return _ownershipHistory[tokenId];
    }

    /**
     * @notice Returns the total number of assets currently minted.
     */
    function getTotalAssetsCreated()
        external
        view
        returns (uint256)
    {
        return totalSupply();
    }

    /**
     * @notice Returns all assets owned by a wallet.
     *
     * ERC721Enumerable provides tokenOfOwnerByIndex().
     */
    function getAssetsOfOwner(
        address owner
    ) external view returns (uint256[] memory) {
        uint256 count = balanceOf(owner);

        uint256[] memory tokenIds =
            new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] =
                tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @notice Returns all currently minted token IDs.
     */
    function getAllAssetIds()
        external
        view
        returns (uint256[] memory)
    {
        uint256 count = totalSupply();

        uint256[] memory tokenIds =
            new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = tokenByIndex(i);
        }

        return tokenIds;
    }

    // =============================================================
    //                       6. TOP HOLDERS
    // =============================================================

    /**
     * @notice Returns up to the requested number of leading holders.
     *
     * @param limit Number of holders requested. Maximum = 10.
     *
     * @dev Sorting occurs in a view function, so it does not consume
     * transaction gas when called off-chain by the frontend.
     */
    function getTopHolders(
        uint256 limit
    )
        external
        view
        returns (
            address[] memory holders,
            uint256[] memory balances
        )
    {
        require(
            limit > 0 && limit <= 10,
            "Limit must be between 1 and 10"
        );

        uint256 activeCount;

        /*
         * First determine how many known holders currently own assets.
         */
        for (
            uint256 i = 0;
            i < _knownHolders.length;
            i++
        ) {
            if (balanceOf(_knownHolders[i]) > 0) {
                activeCount++;
            }
        }

        if (activeCount == 0) {
            return (
                new address[](0),
                new uint256[](0)
            );
        }

        address[] memory activeHolders =
            new address[](activeCount);

        uint256[] memory activeBalances =
            new uint256[](activeCount);

        uint256 index;

        /*
         * Build active holder arrays.
         */
        for (
            uint256 i = 0;
            i < _knownHolders.length;
            i++
        ) {
            uint256 holderBalance =
                balanceOf(_knownHolders[i]);

            if (holderBalance > 0) {
                activeHolders[index] =
                    _knownHolders[i];

                activeBalances[index] =
                    holderBalance;

                index++;
            }
        }

        /*
         * Sort holders by asset balance in descending order.
         * Suitable for this academic/prototype DApp.
         */
        for (
            uint256 i = 0;
            i < activeCount;
            i++
        ) {
            for (
                uint256 j = i + 1;
                j < activeCount;
                j++
            ) {
                if (
                    activeBalances[j] >
                    activeBalances[i]
                ) {
                    uint256 tempBalance =
                        activeBalances[i];

                    activeBalances[i] =
                        activeBalances[j];

                    activeBalances[j] =
                        tempBalance;

                    address tempHolder =
                        activeHolders[i];

                    activeHolders[i] =
                        activeHolders[j];

                    activeHolders[j] =
                        tempHolder;
                }
            }
        }

        uint256 resultCount =
            activeCount < limit
                ? activeCount
                : limit;

        holders =
            new address[](resultCount);

        balances =
            new uint256[](resultCount);

        for (
            uint256 i = 0;
            i < resultCount;
            i++
        ) {
            holders[i] =
                activeHolders[i];

            balances[i] =
                activeBalances[i];
        }

        return (holders, balances);
    }

    /**
     * @notice Number of wallets that have ever held an asset.
     */
    function getKnownHolderCount()
        external
        view
        returns (uint256)
    {
        return _knownHolders.length;
    }

    // =============================================================
    //                 7. INTERNAL HOLDER TRACKING
    // =============================================================

    function _registerHolder(
        address holder
    ) internal {
        if (
            holder != address(0) &&
            !_holderKnown[holder]
        ) {
            _holderKnown[holder] = true;
            _knownHolders.push(holder);
        }
    }

    // =============================================================
    //                8. ERC-721 UPDATE OVERRIDE
    // =============================================================

    /**
     * @dev Centralized ownership-change hook.
     *
     * This ensures:
     * - ownership history also captures normal ERC-721 transfers
     * - stale marketplace listings are automatically cleared
     * - holder addresses are tracked
     * - total transaction count remains synchronized
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address previousOwner =
            super._update(
                to,
                tokenId,
                auth
            );

        /*
         * Add the new owner to known holders.
         */
        if (to != address(0)) {
            _registerHolder(to);
        }

        /*
         * Only record an actual ownership change.
         */
        if (previousOwner != to) {
            uint256 historyPrice =
                _pendingHistoryPrice[tokenId];

            _ownershipHistory[tokenId].push(
                OwnershipRecord({
                    from: previousOwner,
                    to: to,
                    price: historyPrice,
                    timestamp: block.timestamp
                })
            );

            totalTransactions++;

            delete _pendingHistoryPrice[tokenId];

            /*
             * Clear sale state whenever an existing token changes owner.
             */
            if (
                previousOwner != address(0)
            ) {
                Property storage property =
                    _properties[tokenId];

                property.price = 0;
                property.isForSale = false;
                property.seller =
                    payable(address(0));
            }
        }

        return previousOwner;
    }

    // =============================================================
    //                  9. REQUIRED OVERRIDES
    // =============================================================

    function _increaseBalance(
        address account,
        uint128 value
    )
        internal
        override(
            ERC721,
            ERC721Enumerable
        )
    {
        super._increaseBalance(
            account,
            value
        );
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override(
            ERC721,
            ERC721URIStorage
        )
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721,
            ERC721Enumerable,
            ERC721URIStorage
        )
        returns (bool)
    {
        return super.supportsInterface(
            interfaceId
        );
    }
}