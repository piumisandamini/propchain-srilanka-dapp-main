import { expect } from "chai";
import pkg from "hardhat";

const { ethers } = pkg;

describe("RealEstateAsset Marketplace & Trading", function () {
  let RealEstateAsset;
  let realEstate;
  let owner, user1, user2, user3;

  const sampleProperty = {
    location: "Galle Road, Colombo 03",
    floorArea: 1800,
    propertyType: "Commercial",
    registeredValue: ethers.parseEther("100"),
    documentHash:
      "0x1234567890123456789012345678901234567890123456789012345678901234",
    uri: "https://propchain.lk/metadata/colombo03.json",
    price: ethers.parseEther("50"),
    isForSale: true
  };

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    RealEstateAsset =
      await ethers.getContractFactory("RealEstateAsset");

    realEstate =
      await RealEstateAsset.deploy(owner.address);

    await realEstate.waitForDeployment();
  });

  // ============================================================
  // 1. MARKETPLACE LISTING & BUYING
  // ============================================================

  describe("Marketplace Listing & Buying", function () {
    beforeEach(async function () {
      await realEstate.connect(user1).registerAsset(
        sampleProperty.location,
        sampleProperty.floorArea,
        sampleProperty.propertyType,
        sampleProperty.registeredValue,
        sampleProperty.documentHash,
        sampleProperty.uri,
        sampleProperty.price,
        sampleProperty.isForSale
      );
    });

    it("Should allow a buyer to purchase a listed asset", async function () {
      const tx =
        await realEstate
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

      expect(
        await realEstate.ownerOf(1n)
      ).to.equal(user2.address);

      expect(
        await realEstate.totalTransactions()
      ).to.equal(2n);

      const prop =
        await realEstate.getAsset(1n);

      expect(prop.isForSale).to.equal(false);
      expect(prop.price).to.equal(0n);
      expect(prop.seller).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should fail if insufficient ETH is sent for purchase", async function () {
      const lowPrice =
        ethers.parseEther("10");

      await expect(
        realEstate
          .connect(user2)
          .buyAsset(1n, {
            value: lowPrice
          })
      ).to.be.revertedWith(
        "Incorrect ETH amount"
      );
    });

    it("Should fail if excess ETH is sent for purchase", async function () {
      const highPrice =
        ethers.parseEther("60");

      await expect(
        realEstate
          .connect(user2)
          .buyAsset(1n, {
            value: highPrice
          })
      ).to.be.revertedWith(
        "Incorrect ETH amount"
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

    it("Should allow owner to update listing price", async function () {
      const newPrice =
        ethers.parseEther("75");

      await expect(
        realEstate
          .connect(user1)
          .listAssetForSale(
            1n,
            newPrice
          )
      )
        .to.emit(realEstate, "AssetListed")
        .withArgs(
          1n,
          newPrice,
          user1.address
        );

      const prop =
        await realEstate.getAsset(1n);

      expect(prop.price).to.equal(newPrice);
      expect(prop.isForSale).to.equal(true);
      expect(prop.seller).to.equal(
        user1.address
      );
    });

    it("Should prevent non-owner from updating listing", async function () {
      await expect(
        realEstate
          .connect(user2)
          .listAssetForSale(
            1n,
            ethers.parseEther("75")
          )
      ).to.be.revertedWith(
        "Only asset owner can list"
      );
    });

    it("Should allow owner to cancel listing", async function () {
      await expect(
        realEstate
          .connect(user1)
          .cancelListing(1n)
      )
        .to.emit(realEstate, "AssetDelisted")
        .withArgs(
          1n,
          user1.address
        );

      const prop =
        await realEstate.getAsset(1n);

      expect(prop.isForSale).to.equal(false);
      expect(prop.price).to.equal(0n);
      expect(prop.seller).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should prevent purchasing an unlisted asset", async function () {
      await realEstate
        .connect(user1)
        .cancelListing(1n);

      await expect(
        realEstate
          .connect(user2)
          .buyAsset(1n, {
            value: sampleProperty.price
          })
      ).to.be.revertedWith(
        "Asset is not for sale"
      );
    });

    it("Should record ownership history after purchase", async function () {
      await realEstate
        .connect(user2)
        .buyAsset(1n, {
          value: sampleProperty.price
        });

      const history =
        await realEstate
          .getOwnershipHistory(1n);

      expect(history.length).to.equal(2);

      expect(history[0].from).to.equal(
        ethers.ZeroAddress
      );

      expect(history[0].to).to.equal(
        user1.address
      );

      expect(history[1].from).to.equal(
        user1.address
      );

      expect(history[1].to).to.equal(
        user2.address
      );

      expect(history[1].price).to.equal(
        sampleProperty.price
      );
    });
  });

  // ============================================================
  // 2. DIRECT ASSET TRANSFERS
  // ============================================================

  describe("Direct Asset Transfers", function () {
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

    it("Should allow direct peer-to-peer asset transfer without listing", async function () {
      const tx =
        await realEstate
          .connect(user1)
          .transferAsset(
            user2.address,
            1n
          );

      await expect(tx)
        .to.emit(realEstate, "AssetTransferred")
        .withArgs(
          1n,
          user1.address,
          user2.address
        );

      expect(
        await realEstate.ownerOf(1n)
      ).to.equal(user2.address);

      expect(
        await realEstate.totalTransactions()
      ).to.equal(2n);
    });

    it("Should prevent non-owner from transferring asset", async function () {
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

    it("Should reject transfer to same owner", async function () {
      await expect(
        realEstate
          .connect(user1)
          .transferAsset(
            user1.address,
            1n
          )
      ).to.be.revertedWith(
        "Cannot transfer asset to yourself"
      );
    });

    it("Should record ownership history after direct transfer", async function () {
      await realEstate
        .connect(user1)
        .transferAsset(
          user2.address,
          1n
        );

      const history =
        await realEstate
          .getOwnershipHistory(1n);

      expect(history.length).to.equal(2);

      expect(history[1].from).to.equal(
        user1.address
      );

      expect(history[1].to).to.equal(
        user2.address
      );

      expect(history[1].price).to.equal(0n);
    });

    it("Should clear marketplace listing after direct transfer", async function () {
      const listPrice =
        ethers.parseEther("25");

      await realEstate
        .connect(user1)
        .listAssetForSale(
          1n,
          listPrice
        );

      await realEstate
        .connect(user1)
        .transferAsset(
          user2.address,
          1n
        );

      const prop =
        await realEstate.getAsset(1n);

      expect(prop.isForSale).to.equal(false);
      expect(prop.price).to.equal(0n);
      expect(prop.seller).to.equal(
        ethers.ZeroAddress
      );
    });
  });
});