import React, { useState } from "react";
import { ethers } from "ethers";

export default function PropertyCard({
  property,
  account,
  nftContract,
  onViewHistory,
  refreshData,
}) {
  const [listPrice, setListPrice] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [actionMode, setActionMode] = useState(null);

  const isOwner =
    property.owner?.toLowerCase() === account?.toLowerCase();

  const isListed =
    Boolean(property.isForSale || property.isListed);

  const getErrorMessage = (error) =>
    error?.reason ||
    error?.shortMessage ||
    error?.message ||
    "Unknown blockchain error.";

  const refresh = async () => {
    if (typeof refreshData === "function") {
      await refreshData();
    }
  };

  const handleBuy = async () => {
    if (!nftContract) return;

    try {
      setLoadingAction("buy");

      const priceWei =
        property.priceRaw ??
        ethers.parseEther(property.price.toString());

      const tx = await nftContract.buyAsset(
        property.tokenId,
        { value: priceWei }
      );

      await tx.wait();

      alert(
        `Asset #${property.tokenId} purchased successfully.`
      );

      await refresh();
    } catch (error) {
      console.error("Purchase error:", error);

      alert(
        `Purchase failed: ${getErrorMessage(error)}`
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleList = async (event) => {
    event.preventDefault();

    if (
      !listPrice ||
      Number(listPrice) <= 0
    ) {
      alert("Please enter a valid listing price.");
      return;
    }

    try {
      setLoadingAction("list");

      const priceWei =
        ethers.parseEther(listPrice.toString());

      const tx =
        await nftContract.listAssetForSale(
          property.tokenId,
          priceWei
        );

      await tx.wait();

      alert(
        `Asset #${property.tokenId} listed for ${listPrice} ETH.`
      );

      setListPrice("");
      setActionMode(null);

      await refresh();
    } catch (error) {
      console.error("Listing error:", error);

      alert(
        `Listing failed: ${getErrorMessage(error)}`
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancelListing = async () => {
    try {
      setLoadingAction("cancel");

      const tx =
        await nftContract.cancelListing(
          property.tokenId
        );

      await tx.wait();

      alert(
        `Listing for Asset #${property.tokenId} cancelled successfully.`
      );

      setActionMode(null);

      await refresh();
    } catch (error) {
      console.error(
        "Cancel listing error:",
        error
      );

      alert(
        `Cancel listing failed: ${getErrorMessage(error)}`
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTransfer = async (event) => {
    event.preventDefault();

    const recipient =
      transferRecipient.trim();

    if (
      !recipient ||
      !ethers.isAddress(recipient)
    ) {
      alert(
        "Please enter a valid recipient wallet address."
      );
      return;
    }

    if (
      account &&
      recipient.toLowerCase() === account.toLowerCase()
    ) {
      alert(
        "You cannot transfer an asset to your own wallet."
      );
      return;
    }

    try {
      setLoadingAction("transfer");

      const tx =
        await nftContract.transferAsset(
          recipient,
          property.tokenId
        );

      await tx.wait();

      alert(
        `Asset #${property.tokenId} transferred successfully.`
      );

      setTransferRecipient("");
      setActionMode(null);

      await refresh();
    } catch (error) {
      console.error("Transfer error:", error);

      alert(
        `Transfer failed: ${getErrorMessage(error)}`
      );
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.tokenId}>
          Token ID #{property.tokenId}
        </span>

        <span
          style={{
            ...styles.badge,
            backgroundColor: isListed
              ? "rgba(16, 185, 129, 0.15)"
              : "rgba(148, 163, 184, 0.15)",
            color: isListed
              ? "#10b981"
              : "#94a3b8",
          }}
        >
          {isListed
            ? "For Sale"
            : "Not For Sale"}
        </span>
      </div>

      <h3 style={styles.location}>
        {property.location ||
          "Location Not Specified"}
      </h3>

      <div style={styles.detailsGrid}>
        <div>
          <span style={styles.detailLabel}>
            Type
          </span>

          <span style={styles.detailValue}>
            {property.propertyType ||
              "Unknown"}
          </span>
        </div>

        <div>
          <span style={styles.detailLabel}>
            Area
          </span>

          <span style={styles.detailValue}>
            {property.areaSqFt
              ? `${property.areaSqFt} sq ft`
              : "N/A"}
          </span>
        </div>

        <div>
          <span style={styles.detailLabel}>
            Registered Value
          </span>

          <span style={styles.detailValue}>
            {property.registeredValueEth
              ? `${property.registeredValueEth} ETH`
              : "N/A"}
          </span>
        </div>

        <div>
          <span style={styles.detailLabel}>
            Owner
          </span>

          <span style={styles.detailValue}>
            {property.owner
              ? `${property.owner.slice(
                  0,
                  6
                )}...${property.owner.slice(-4)}`
              : "N/A"}
          </span>
        </div>
      </div>

      {isListed && (
        <div style={styles.priceContainer}>
          <span style={styles.priceLabel}>
            Price
          </span>

          <span style={styles.priceValue}>
            {property.price} ETH
          </span>
        </div>
      )}

      <div style={styles.actions}>
        {onViewHistory && (
          <button
            type="button"
            onClick={() =>
              onViewHistory(property.tokenId)
            }
            style={styles.secondaryBtn}
          >
            Ownership History
          </button>
        )}

        {!isOwner && isListed && (
          <button
            type="button"
            onClick={handleBuy}
            disabled={loadingAction !== null}
            style={styles.primaryBtn}
          >
            {loadingAction === "buy"
              ? "Buying..."
              : `Buy for ${property.price} ETH`}
          </button>
        )}

        {isOwner && (
          <>
            {!isListed ? (
              <button
                type="button"
                onClick={() =>
                  setActionMode(
                    actionMode === "list"
                      ? null
                      : "list"
                  )
                }
                style={styles.primaryBtn}
              >
                List for Sale
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelListing}
                disabled={loadingAction !== null}
                style={styles.secondaryBtn}
              >
                {loadingAction === "cancel"
                  ? "Cancelling..."
                  : "Cancel Listing"}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setActionMode(
                  actionMode === "transfer"
                    ? null
                    : "transfer"
                )
              }
              style={styles.secondaryBtn}
            >
              Transfer Ownership
            </button>
          </>
        )}
      </div>

      {actionMode === "list" &&
        isOwner &&
        !isListed && (
          <form
            onSubmit={handleList}
            style={styles.inlineForm}
          >
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Listing Price in ETH"
              value={listPrice}
              onChange={(e) =>
                setListPrice(e.target.value)
              }
              required
              style={styles.input}
            />

            <button
              type="submit"
              disabled={loadingAction !== null}
              style={styles.submitBtn}
            >
              {loadingAction === "list"
                ? "Confirming..."
                : "Confirm Listing"}
            </button>
          </form>
        )}

      {actionMode === "transfer" &&
        isOwner && (
          <form
            onSubmit={handleTransfer}
            style={styles.inlineForm}
          >
            <input
              type="text"
              placeholder="Recipient Wallet Address (0x...)"
              value={transferRecipient}
              onChange={(e) =>
                setTransferRecipient(
                  e.target.value
                )
              }
              required
              style={styles.input}
            />

            <button
              type="submit"
              disabled={loadingAction !== null}
              style={styles.submitBtn}
            >
              {loadingAction === "transfer"
                ? "Transferring..."
                : "Confirm Transfer"}
            </button>
          </form>
        )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },

  tokenId: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#38bdf8",
    letterSpacing: "0.5px",
  },

  badge: {
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "600",
  },

  location: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
    color: "#f8fafc",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "8px",
    backgroundColor: "#020617",
    padding: "10px",
    borderRadius: "8px",
  },

  detailLabel: {
    display: "block",
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
  },

  detailValue: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#cbd5e1",
  },

  priceContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: "8px",
    border:
      "1px solid rgba(56, 189, 248, 0.2)",
  },

  priceLabel: {
    fontSize: "12px",
    color: "#94a3b8",
  },

  priceValue: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#38bdf8",
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "4px",
  },

  primaryBtn: {
    flex: 1,
    minWidth: "120px",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#0284c7",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: "12px",
    cursor: "pointer",
  },

  secondaryBtn: {
    flex: 1,
    minWidth: "120px",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "transparent",
    color: "#cbd5e1",
    fontWeight: "600",
    fontSize: "12px",
    cursor: "pointer",
  },

  inlineForm: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid #334155",
  },

  input: {
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "#020617",
    color: "#ffffff",
    fontSize: "12px",
    outline: "none",
  },

  submitBtn: {
    padding: "8px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#10b981",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: "12px",
    cursor: "pointer",
  },
};