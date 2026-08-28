import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import { ethers } from "ethers";

function AssetActions({
  account,
  nftContract,
  filter,
  onViewHistory,
  refreshStats,
}) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  const [listPrice, setListPrice] = useState({});
  const [transferTo, setTransferTo] = useState({});

  const [actionLoading, setActionLoading] = useState({});

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const setTokenActionLoading = (
    tokenId,
    action,
    value
  ) => {
    setActionLoading((previous) => ({
      ...previous,
      [`${tokenId}-${action}`]: value,
    }));
  };

  const isActionLoading = (
    tokenId,
    action
  ) =>
    Boolean(
      actionLoading[
        `${tokenId}-${action}`
      ]
    );

  const getErrorMessage = (error) =>
    error?.reason ||
    error?.shortMessage ||
    error?.message ||
    "Unknown blockchain error.";

  // ============================================================
  // LOAD ASSETS
  // ============================================================

  const loadProperties =
    useCallback(async () => {
      if (!nftContract) {
        setProperties([]);
        return;
      }

      setLoading(true);

      try {
        let tokenIds = [];

        if (
          typeof nftContract.getAllAssetIds ===
          "function"
        ) {
          const ids =
            await nftContract.getAllAssetIds();

          tokenIds = ids.map(
            (tokenId) =>
              Number(tokenId)
          );
        } else {
          let total = 0n;

          if (
            typeof nftContract.getTotalAssetsCreated ===
            "function"
          ) {
            total =
              await nftContract.getTotalAssetsCreated();
          } else if (
            typeof nftContract.totalSupply ===
            "function"
          ) {
            total =
              await nftContract.totalSupply();
          }

          tokenIds = Array.from(
            {
              length: Number(total),
            },
            (_, index) => index + 1
          );
        }

        const loaded = [];

        for (const tokenId of tokenIds) {
          try {
            const [
              owner,
              details,
            ] = await Promise.all([
              nftContract.ownerOf(
                tokenId
              ),
              nftContract.getAsset(
                tokenId
              ),
            ]);

            const property = {
              tokenId,
              owner,
              title:
                `Asset #${tokenId}`,
              location:
                details.location ||
                "N/A",
              areaSqFt:
                details.floorArea
                  ? details.floorArea.toString()
                  : "0",
              propertyType:
                details.propertyType ||
                "Unknown",
              registeredValueEth:
                details.registeredValue
                  ? ethers.formatEther(
                      details.registeredValue
                    )
                  : "0",
              documentHash:
                details.documentHash ||
                "",
              isListed:
                Boolean(
                  details.isForSale
                ),
              price:
                details.price
                  ? ethers.formatEther(
                      details.price
                    )
                  : "0",
              seller:
                details.seller,
            };

            if (
              filter === "mine"
            ) {
              if (
                account &&
                owner.toLowerCase() ===
                  account.toLowerCase()
              ) {
                loaded.push(
                  property
                );
              }
            } else {
              loaded.push(
                property
              );
            }
          } catch (error) {
            console.warn(
              `Unable to load asset #${tokenId}:`,
              error
            );
          }
        }

        setProperties(loaded);
      } catch (error) {
        console.error(
          "Error loading properties:",
          error
        );

        setProperties([]);
      } finally {
        setLoading(false);
      }
    }, [
      nftContract,
      account,
      filter,
    ]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // ============================================================
  // PURCHASE
  // ============================================================

  const handleBuy = async (
    tokenId,
    priceEth
  ) => {
    if (!nftContract) {
      return;
    }

    try {
      setTokenActionLoading(
        tokenId,
        "buy",
        true
      );

      const priceWei =
        ethers.parseEther(
          priceEth.toString()
        );

      const tx =
        await nftContract.buyAsset(
          tokenId,
          {
            value: priceWei,
          }
        );

      await tx.wait();

      alert(
        `Asset #${tokenId} purchased successfully.`
      );

      await loadProperties();

      if (
        typeof refreshStats ===
        "function"
      ) {
        await refreshStats();
      }
    } catch (error) {
      console.error(
        "Purchase failed:",
        error
      );

      alert(
        `Purchase failed: ${getErrorMessage(
          error
        )}`
      );
    } finally {
      setTokenActionLoading(
        tokenId,
        "buy",
        false
      );
    }
  };

  // ============================================================
  // LIST FOR SALE
  // ============================================================

  const handleList = async (
    tokenId
  ) => {
    const price =
      listPrice[tokenId];

    if (
      !price ||
      Number(price) <= 0
    ) {
      alert(
        "Please enter a valid price in ETH."
      );
      return;
    }

    try {
      const priceWei =
        ethers.parseEther(
          price.toString()
        );

      setTokenActionLoading(
        tokenId,
        "list",
        true
      );

      const tx =
        await nftContract.listAssetForSale(
          tokenId,
          priceWei
        );

      await tx.wait();

      alert(
        `Asset #${tokenId} listed for sale successfully.`
      );

      setListPrice(
        (previous) => ({
          ...previous,
          [tokenId]: "",
        })
      );

      await loadProperties();

      if (
        typeof refreshStats ===
        "function"
      ) {
        await refreshStats();
      }
    } catch (error) {
      console.error(
        "Listing failed:",
        error
      );

      alert(
        `Listing failed: ${getErrorMessage(
          error
        )}`
      );
    } finally {
      setTokenActionLoading(
        tokenId,
        "list",
        false
      );
    }
  };

  // ============================================================
  // CANCEL LISTING
  // ============================================================

  const handleCancelListing =
    async (tokenId) => {
      try {
        setTokenActionLoading(
          tokenId,
          "cancel",
          true
        );

        const tx =
          await nftContract.cancelListing(
            tokenId
          );

        await tx.wait();

        alert(
          `Listing for Asset #${tokenId} cancelled successfully.`
        );

        await loadProperties();

        if (
          typeof refreshStats ===
          "function"
        ) {
          await refreshStats();
        }
      } catch (error) {
        console.error(
          "Cancel listing failed:",
          error
        );

        alert(
          `Unable to cancel listing: ${getErrorMessage(
            error
          )}`
        );
      } finally {
        setTokenActionLoading(
          tokenId,
          "cancel",
          false
        );
      }
    };

  // ============================================================
  // DIRECT TRANSFER
  // ============================================================

  const handleDirectTransfer =
    async (tokenId) => {
      const recipient =
        transferTo[tokenId]?.trim();

      if (
        !recipient ||
        !ethers.isAddress(
          recipient
        )
      ) {
        alert(
          "Please enter a valid recipient wallet address."
        );
        return;
      }

      if (
        account &&
        recipient.toLowerCase() ===
          account.toLowerCase()
      ) {
        alert(
          "You cannot transfer an asset to your own wallet."
        );
        return;
      }

      try {
        setTokenActionLoading(
          tokenId,
          "transfer",
          true
        );

        const tx =
          await nftContract.transferAsset(
            recipient,
            tokenId
          );

        await tx.wait();

        alert(
          `Asset #${tokenId} transferred successfully to ${recipient}.`
        );

        setTransferTo(
          (previous) => ({
            ...previous,
            [tokenId]: "",
          })
        );

        await loadProperties();

        if (
          typeof refreshStats ===
          "function"
        ) {
          await refreshStats();
        }
      } catch (error) {
        console.error(
          "Transfer failed:",
          error
        );

        alert(
          `Transfer failed: ${getErrorMessage(
            error
          )}`
        );
      } finally {
        setTokenActionLoading(
          tokenId,
          "transfer",
          false
        );
      }
    };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="panel">
      <h2>
        {filter === "mine"
          ? "My Digital Assets"
          : "All Registered Assets"}
      </h2>

      <p className="hint">
        {filter === "mine"
          ? "Manage your tokenized assets, list or cancel marketplace listings, and transfer ownership directly to another wallet."
          : "View all digital assets registered on the blockchain. Assets currently listed for sale can be purchased through the PropChain smart contract."}
      </p>

      {loading ? (
        <div
          className="empty"
          style={{
            marginTop: "24px",
          }}
        >
          Loading asset records from
          blockchain...
        </div>
      ) : properties.length ===
        0 ? (
        <div
          className="empty"
          style={{
            marginTop: "24px",
          }}
        >
          {filter === "mine"
            ? "You do not own any digital assets yet."
            : "No digital assets registered on-chain yet."}
        </div>
      ) : (
        <div
          className="cards"
          style={{
            marginTop: "24px",
          }}
        >
          {properties.map(
            (property) => {
              const isOwner =
                account &&
                property.owner
                  .toLowerCase()
                  .toLowerCase() ===
                  account.toLowerCase();

              return (
                <div
                  className="card"
                  key={
                    property.tokenId
                  }
                >
                  <div>
                    <span className="badge">
                      {
                        property.propertyType
                      }
                    </span>

                    <h3>
                      {
                        property.title
                      }
                    </h3>

                    <div className="loc">
                      {
                        property.location
                      }
                    </div>

                    <div className="row">
                      <span>
                        Token ID:
                      </span>
                      <b>
                        #
                        {
                          property.tokenId
                        }
                      </b>
                    </div>

                    <div className="row">
                      <span>
                        Floor Area:
                      </span>
                      <b>
                        {
                          property.areaSqFt
                        }{" "}
                        sq ft
                      </b>
                    </div>

                    <div className="row">
                      <span>
                        Registered Value:
                      </span>
                      <b>
                        {
                          property.registeredValueEth
                        }{" "}
                        ETH
                      </b>
                    </div>

                    <div className="row">
                      <span>
                        Current Owner:
                      </span>

                      <b>
                        {property.owner
                          ? `${property.owner.slice(
                              0,
                              6
                            )}...${property.owner.slice(
                              -4
                            )}`
                          : "Unknown"}
                      </b>
                    </div>

                    <div className="row">
                      <span>
                        Listing Status:
                      </span>

                      <b>
                        {property.isListed
                          ? `For Sale (${property.price} ETH)`
                          : "Not For Sale"}
                      </b>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "16px",
                    }}
                  >
                    {property.isListed &&
                      !isOwner && (
                        <button
                          type="button"
                          className="btn"
                          style={{
                            width:
                              "100%",
                          }}
                          disabled={isActionLoading(
                            property.tokenId,
                            "buy"
                          )}
                          onClick={() =>
                            handleBuy(
                              property.tokenId,
                              property.price
                            )
                          }
                        >
                          {isActionLoading(
                            property.tokenId,
                            "buy"
                          )
                            ? "Processing Purchase..."
                            : `Buy for ${property.price} ETH`}
                        </button>
                      )}

                    {isOwner && (
                      <div>
                        {!property.isListed ? (
                          <div
                            style={{
                              marginBottom:
                                "10px",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Price in ETH"
                              value={
                                listPrice[
                                  property
                                    .tokenId
                                ] || ""
                              }
                              onChange={(
                                event
                              ) =>
                                setListPrice(
                                  (
                                    previous
                                  ) => ({
                                    ...previous,
                                    [property.tokenId]:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                              style={{
                                width:
                                  "100%",
                                marginBottom:
                                  "6px",
                              }}
                            />

                            <button
                              type="button"
                              className="btn"
                              style={{
                                width:
                                  "100%",
                              }}
                              disabled={isActionLoading(
                                property.tokenId,
                                "list"
                              )}
                              onClick={() =>
                                handleList(
                                  property.tokenId
                                )
                              }
                            >
                              {isActionLoading(
                                property.tokenId,
                                "list"
                              )
                                ? "Listing..."
                                : "List for Sale"}
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              marginBottom:
                                "12px",
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "13px",
                                color:
                                  "var(--accent)",
                                textAlign:
                                  "center",
                                marginBottom:
                                  "8px",
                              }}
                            >
                              Your asset is
                              currently listed
                              for{" "}
                              {
                                property.price
                              }{" "}
                              ETH
                            </div>

                            <button
                              type="button"
                              className="btn secondary"
                              style={{
                                width:
                                  "100%",
                              }}
                              disabled={isActionLoading(
                                property.tokenId,
                                "cancel"
                              )}
                              onClick={() =>
                                handleCancelListing(
                                  property.tokenId
                                )
                              }
                            >
                              {isActionLoading(
                                property.tokenId,
                                "cancel"
                              )
                                ? "Cancelling..."
                                : "Cancel Listing"}
                            </button>
                          </div>
                        )}

                        <div
                          style={{
                            borderTop:
                              "1px dashed var(--border)",
                            paddingTop:
                              "10px",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Recipient Address (0x...)"
                            value={
                              transferTo[
                                property
                                  .tokenId
                              ] || ""
                            }
                            onChange={(
                              event
                            ) =>
                              setTransferTo(
                                (
                                  previous
                                ) => ({
                                  ...previous,
                                  [property.tokenId]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            style={{
                              width:
                                "100%",
                              marginBottom:
                                "6px",
                            }}
                          />

                          <button
                            type="button"
                            className="btn secondary"
                            style={{
                              width:
                                "100%",
                            }}
                            disabled={isActionLoading(
                              property.tokenId,
                              "transfer"
                            )}
                            onClick={() =>
                              handleDirectTransfer(
                                property.tokenId
                              )
                            }
                          >
                            {isActionLoading(
                              property.tokenId,
                              "transfer"
                            )
                              ? "Transferring..."
                              : "Transfer Ownership"}
                          </button>
                        </div>
                      </div>
                    )}

                    {onViewHistory && (
                      <button
                        type="button"
                        className="btn secondary"
                        style={{
                          width:
                            "100%",
                          marginTop:
                            "10px",
                        }}
                        onClick={() =>
                          onViewHistory(
                            property.tokenId
                          )
                        }
                      >
                        View Ownership
                        History
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

export default AssetActions;