import { expect } from "chai";
import pkg from "hardhat";

const { ethers } = pkg;

describe("RealEstateAsset Smart Contract", function () {
  let RealEstateAsset;
  let realEstate;
  let owner, user1, user2, user3;

  const sampleProperty = {
    location: "742 Evergreen Terrace, Springfield",
    floorArea: 2500,
    propertyType: "Residential",
    registeredValue: ethers.parseEther("150"),
    documentHash:
      "0x1234567890123456789012345678901234567890123456789012345678901234",
    uri: "https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    price: ethers.parseEther("160"),
    isForSale: true
  };

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    RealEstateAsset = await ethers.getContractFactory("RealEstateAsset");

    realEstate = await RealEstateAsset.deploy(owner.address);

    await realEstate.waitForDeployment();
  });

  // ============================================================
  // 1. DEPLOYMENT
  // ============================================================

  describe("Deployment", function () {
    it("Should set correct token name and symbol", async function () {
      expect(await realEstate.name()).to.equal(
        "PropChain Real Estate Asset"
      );

      expect(await realEstate.symbol()).to.equal("PREA");
    });

    it("Should set the initial contract owner", async function () {
      expect(await realEstate.owner()).to.equal(owner.address);
    });

    it("Should start with zero assets and transactions", async function () {
      expect(await realEstate.getTotalAssetsCreated()).to.equal(0n);
      expect(await realEstate.totalTransactions()).to.equal(0n);
    });
  });

  // ============================================================
  // 2. REGISTRATION & MINTING
  // ============================================================

  describe("Property Registration", function () {
    it("Should allow any user to register and mint a property NFT", async function () {
      const tx = await realEstate.connect(user1).registerAsset(
        sampleProperty.location,
        sampleProperty.floorArea,
        sampleProperty.propertyType,
        sampleProperty.registeredValue,
        sampleProperty.documentHash,
        sampleProperty.uri,
        sampleProperty.price,
        sampleProperty.isForSale
      );

      await expect(tx)
        .to.emit(realEstate, "AssetRegistered")
        .withArgs(
          1n,
          user1.address,
          sampleProperty.location,
          sampleProperty.price
        );

      expect(await realEstate.ownerOf(1n)).to.equal(user1.address);

      expect(
        await realEstate.getTotalAssetsCreated()
      ).to.equal(1n);

      expect(await realEstate.tokenURI(1n)).to.equal(
        sampleProperty.uri
      );

      expect(await realEstate.totalTransactions()).to.equal(1n);
    });

    it("Should store property metadata correctly", async function () {
      await realEstate.connect(user1).registerAsset(
        sampleProperty.location,
        sampleProperty.floorArea,
        sampleProperty.propertyType,
        sampleProperty.registeredValue,
        sampleProperty.documentHash,
        sampleProperty.uri,
        sampleProperty.price,
        true
      );

      const prop = await realEstate.getAsset(1n);

      expect(prop.id).to.equal(1n);
      expect(prop.location).to.equal(sampleProperty.location);
      expect(prop.floorArea).to.equal(
        BigInt(sampleProperty.floorArea)
      );
      expect(prop.propertyType).to.equal(
        sampleProperty.propertyType
      );
      expect(prop.registeredValue).to.equal(
        sampleProperty.registeredValue
      );
      expect(prop.documentHash).to.equal(
        sampleProperty.documentHash
      );
      expect(prop.price).to.equal(sampleProperty.price);
      expect(prop.isForSale).to.equal(true);
      expect(prop.seller).to.equal(user1.address);
    });

    it("Should record initial ownership history", async function () {
      await realEstate.connect(user1).registerAsset(
        sampleProperty.location,
        sampleProperty.floorArea,
        sampleProperty.propertyType,
        sampleProperty.registeredValue,
        sampleProperty.documentHash,
        sampleProperty.uri,
        0n,
        false
      );

      const history =
        await realEstate.getOwnershipHistory(1n);

      expect(history.length).to.equal(1);

      expect(history[0].from).to.equal(ethers.ZeroAddress);
      expect(history[0].to).to.equal(user1.address);
      expect(history[0].price).to.equal(0n);
    });

    it("Should reject registration with empty location", async function () {
      await expect(
        realEstate.connect(user1).registerAsset(
          "",
          sampleProperty.floorArea,
          sampleProperty.propertyType,
          sampleProperty.registeredValue,
          sampleProperty.documentHash,
          sampleProperty.uri,
          sampleProperty.price,
          true
        )
      ).to.be.revertedWith("Location is required");
    });

    it("Should reject zero floor area", async function () {
      await expect(
        realEstate.connect(user1).registerAsset(
          sampleProperty.location,
          0,
          sampleProperty.propertyType,
          sampleProperty.registeredValue,
          sampleProperty.documentHash,
          sampleProperty.uri,
          sampleProperty.price,
          true
        )
      ).to.be.revertedWith(
        "Floor area must be greater than zero"
      );
    });

    it("Should reject a listed asset with zero price", async function () {
      await expect(
        realEstate.connect(user1).registerAsset(
          sampleProperty.location,
          sampleProperty.floorArea,
          sampleProperty.propertyType,
          sampleProperty.registeredValue,
          sampleProperty.documentHash,
          sampleProperty.uri,
          0n,
          true
        )
      ).to.be.revertedWith(
        "Listed asset must have a sale price"
      );
    });
  });

  // ============================================================
  // 3. MARKETPLACE
  // ============================================================

  describe("Marketplace Transactions", function () {
    beforeEach(async function () {
      await realEstate.connect(user1).registerAsset(
        sampleProperty.location,
        sampleProperty.floorArea,
        sampleProperty.propertyType,
        sampleProperty.registeredValue,
        sampleProperty.documentHash,
        sampleProperty.uri,
        sampleProperty.price,
        true
      );
    });

    it("Should allow another user to purchase a listed asset", async function () {
      const tx = await realEstate
        .connect(user2)
        .buyAsset(1n, {
          value: sampleProperty.price
        });

      await expect(tx)
        .to.emit(realEstate, "AssetPurchased")
        .withArgs(
          1n,
          user1.address,
          user2.address,
          sampleProperty.price
        );

      expect(await realEstate.ownerOf(1n)).to.equal(
        user2.address
      );

      expect(await realEstate.totalTransactions()).to.equal(2n);

      const prop = await realEstate.getAsset(1n);

      expect(prop.isForSale).to.equal(false);
      expect(prop.price).to.equal(0n);
      expect(prop.seller).to.equal(ethers.ZeroAddress);
    });

    it("Should record purchase in ownership history", async function () {
      await realEstate
        .connect(user2)
        .buyAsset(1n, {
          value: sampleProperty.price
        });

      const history =
        await realEstate.getOwnershipHistory(1n);

      expect(history.length).to.equal(2);

      expect(history[1].from).to.equal(user1.address);
      expect(history[1].to).to.equal(user2.address);
      expect(history[1].price).to.equal(
        sampleProperty.price
      );
    });

    it("Should prevent owner from buying their own asset", async function () {
      await expect(
        realEstate
          .connect(user1)
          .buyAsset(1n, {
            value: sampleProperty.price
          })
      ).to.be.revertedWith(
        "Owner cannot buy own asset"
      );
    });

    it("Should reject insufficient payment", async function () {
      const insufficient =
        sampleProperty.price - ethers.parseEther("1");

      await expect(
        realEstate
          .connect(user2)
          .buyAsset(1n, {
            value: insufficient
          })
      ).to.be.revertedWith(
        "Incorrect ETH amount"
      );
    });

    it("Should reject overpayment", async function () {
      const overpayment =
        sampleProperty.price + ethers.parseEther("1");

      await expect(
        realEstate
          .connect(user2)
          .buyAsset(1n, {
            value: overpayment
          })
      ).to.be.revertedWith(
        "Incorrect ETH amount"
      );
    });
  });

  // ============================================================
  // 4. LISTING MANAGEMENT
  // ============================================================

  describe("Sale Listing Management", function () {
    beforeEach(async function () {
      await realEstate.connect(user1).registerAsset(
        sampleProperty.location,
        sampleProperty.floorArea,
        sampleProperty.propertyType,
        sampleProperty.registeredValue,
        sampleProperty.documentHash,
        sampleProperty.uri,
        0n,
        false
      );
    });

    it("Should allow owner to list an asset for sale", async function () {
      const price = ethers.parseEther("10");

      await expect(
        realEstate.connect(user1).listAssetForSale(
          1n,
          price
        )
      )
        .to.emit(realEstate, "AssetListed")
        .withArgs(
          1n,
          price,
          user1.address
        );

      const prop = await realEstate.getAsset(1n);

      expect(prop.isForSale).to.equal(true);
      expect(prop.price).to.equal(price);
      expect(prop.seller).to.equal(user1.address);
    });

    it("Should prevent non-owner from listing asset", async function () {
      await expect(
        realEstate.connect(user2).listAssetForSale(
          1n,
          ethers.parseEther("10")
        )
      ).to.be.revertedWith(
        "Only asset owner can list"
      );
    });

    it("Should allow owner to cancel listing", async function () {
      const price = ethers.parseEther("10");

      await realEstate
        .connect(user1)
        .listAssetForSale(1n, price);

      await expect(
        realEstate.connect(user1).cancelListing(1n)
      )
        .to.emit(realEstate, "AssetDelisted")
        .withArgs(1n, user1.address);

      const prop = await realEstate.getAsset(1n);

      expect(prop.isForSale).to.equal(false);
      expect(prop.price).to.equal(0n);
      expect(prop.seller).to.equal(ethers.ZeroAddress);
    });
  });

  // ============================================================
  // 5. TRANSFERS
  // ============================================================

  describe("Transfers & Enumeration", function () {
    beforeEach(async function () {
      await realEstate.connect(user1).registerAsset(
        sampleProperty.location,
        sampleProperty.floorArea,
        sampleProperty.propertyType,
        sampleProperty.registeredValue,
        sampleProperty.documentHash,
        sampleProperty.uri,
        0n,
        false
      );
    });

    it("Should allow token owner to transfer asset directly", async function () {
      await expect(
        realEstate
          .connect(user1)
          .transferAsset(
            user2.address,
            1n
          )
      )
        .to.emit(realEstate, "AssetTransferred")
        .withArgs(
          1n,
          user1.address,
          user2.address
        );

      expect(await realEstate.ownerOf(1n)).to.equal(
        user2.address
      );

      expect(
        await realEstate.balanceOf(user1.address)
      ).to.equal(0n);

      expect(
        await realEstate.balanceOf(user2.address)
      ).to.equal(1n);

      expect(await realEstate.totalTransactions()).to.equal(2n);
    });

    it("Should prevent unauthorized direct transfer", async function () {
      await expect(
        realEstate
          .connect(user2)
          .transferAsset(
            user3.address,
            1n
          )
      ).to.be.revertedWith(
        "Caller is not token owner"
      );
    });

    it("Should reject transfer to zero address", async function () {
      await expect(
        realEstate
          .connect(user1)
          .transferAsset(
            ethers.ZeroAddress,
            1n
          )
      ).to.be.revertedWith(
        "Cannot transfer to zero address"
      );
    });

    it("Should clear listing after direct ownership transfer", async function () {
      await realEstate
        .connect(user1)
        .listAssetForSale(
          1n,
          ethers.parseEther("20")
        );

      await realEstate
        .connect(user1)
        .transferAsset(
          user2.address,
          1n
        );

      const prop = await realEstate.getAsset(1n);

      expect(prop.isForSale).to.equal(false);
      expect(prop.price).to.equal(0n);
      expect(prop.seller).to.equal(ethers.ZeroAddress);
    });

    it("Should record transfer in ownership history", async function () {
      await realEstate
        .connect(user1)
        .transferAsset(
          user2.address,
          1n
        );

      const history =
        await realEstate.getOwnershipHistory(1n);

      expect(history.length).to.equal(2);

      expect(history[1].from).to.equal(user1.address);
      expect(history[1].to).to.equal(user2.address);
      expect(history[1].price).to.equal(0n);
    });

    it("Should support standard ERC721 interface", async function () {
      const IERC721_INTERFACE_ID = "0x80ac58cd";

      expect(
        await realEstate.supportsInterface(
          IERC721_INTERFACE_ID
        )
      ).to.equal(true);
    });
  });

  // ============================================================
  // 6. OWNER ASSET ENUMERATION
  // ============================================================

  describe("Asset Enumeration", function () {
    it("Should return assets owned by a wallet", async function () {
      for (let i = 0; i < 3; i++) {
        await realEstate.connect(user1).registerAsset(
          `Property ${i + 1}`,
          1000 + i,
          "Residential",
          ethers.parseEther("10"),
          `document-${i + 1}`,
          `ipfs://property-${i + 1}`,
          0n,
          false
        );
      }

      const assets =
        await realEstate.getAssetsOfOwner(
          user1.address
        );

      expect(assets.length).to.equal(3);

      expect(assets[0]).to.equal(1n);
      expect(assets[1]).to.equal(2n);
      expect(assets[2]).to.equal(3n);
    });

    it("Should return all minted token IDs", async function () {
      for (let i = 0; i < 2; i++) {
        await realEstate.connect(user1).registerAsset(
          `Property ${i + 1}`,
          1500,
          "Commercial",
          ethers.parseEther("20"),
          `doc-${i}`,
          `ipfs://metadata-${i}`,
          0n,
          false
        );
      }

      const ids =
        await realEstate.getAllAssetIds();

      expect(ids.length).to.equal(2);

      expect(ids[0]).to.equal(1n);
      expect(ids[1]).to.equal(2n);
    });
  });

  // ============================================================
  // 7. TOP HOLDERS
  // ============================================================

  describe("Top Holders", function () {
    it("Should return holders ranked by asset balance", async function () {
      // user1 = 3 assets
      for (let i = 0; i < 3; i++) {
        await realEstate.connect(user1).registerAsset(
          `User1 Property ${i}`,
          1000,
          "Residential",
          ethers.parseEther("5"),
          `user1-doc-${i}`,
          `ipfs://user1-${i}`,
          0n,
          false
        );
      }

      // user2 = 2 assets
      for (let i = 0; i < 2; i++) {
        await realEstate.connect(user2).registerAsset(
          `User2 Property ${i}`,
          1000,
          "Commercial",
          ethers.parseEther("5"),
          `user2-doc-${i}`,
          `ipfs://user2-${i}`,
          0n,
          false
        );
      }

      // user3 = 1 asset
      await realEstate.connect(user3).registerAsset(
        "User3 Property",
        1000,
        "Land",
        ethers.parseEther("5"),
        "user3-doc",
        "ipfs://user3",
        0n,
        false
      );

      const [holders, balances] =
        await realEstate.getTopHolders(10);

      expect(holders.length).to.equal(3);
      expect(balances.length).to.equal(3);

      expect(holders[0]).to.equal(user1.address);
      expect(balances[0]).to.equal(3n);

      expect(holders[1]).to.equal(user2.address);
      expect(balances[1]).to.equal(2n);

      expect(holders[2]).to.equal(user3.address);
      expect(balances[2]).to.equal(1n);
    });

    it("Should reject top-holder limit above 10", async function () {
      await expect(
        realEstate.getTopHolders(11)
      ).to.be.revertedWith(
        "Limit must be between 1 and 10"
      );
    });
  });
});