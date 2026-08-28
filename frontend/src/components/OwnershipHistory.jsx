import React, { useState } from "react";
import { ethers } from "ethers";

function OwnershipHistory({ nftContract }) {
  const [tokenId, setTokenId] = useState("1");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // FORMAT WALLET ADDRESS
  // ============================================================

  const truncateAddress = (address) => {
    if (!address) {
      return "";
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // ============================================================
  // OWNERSHIP TYPE
  // ============================================================

  const getOwnershipType = (record) => {
    if (record.from === ethers.ZeroAddress) {
      return "Mint / Registration";
    }

    if (record.price > 0n) {
      return "Sale / Purchase";
    }

    return "Direct Transfer";
  };

  // ============================================================
  // LOAD OWNERSHIP HISTORY
  // ============================================================

  const handleLookup = async () => {
    setError("");
    setHistory([]);
    setSearched(false);

    if (!nftContract) {
      setError(
        "Smart contract is not connected. Please connect your wallet first."
      );
      return;
    }

    const parsedTokenId = Number(tokenId);

    if (
      !tokenId ||
      !Number.isInteger(parsedTokenId) ||
      parsedTokenId <= 0
    ) {
      setError(
        "Please enter a valid Asset Token ID greater than zero."
      );
      return;
    }

    try {
      setLoading(true);
      setSearched(true);

      if (
        typeof nftContract.getOwnershipHistory !==
        "function"
      ) {
        throw new Error(
          "Ownership history function is unavailable in the current smart contract."
        );
      }

      const rawHistory =
        await nftContract.getOwnershipHistory(
          BigInt(parsedTokenId)
        );

      const records = rawHistory.map(
        (record, index) => ({
          index: index + 1,

          from: record.from,

          owner: record.to,

          type:
            getOwnershipType(record),

          priceEth:
            record.price > 0n
              ? ethers.formatEther(
                  record.price
                )
              : "—",

          timestamp:
            record.timestamp > 0n
              ? new Date(
                  Number(
                    record.timestamp
                  ) * 1000
                ).toLocaleString()
              : "N/A",
        })
      );

      setHistory(records);
    } catch (err) {
      console.error(
        "Ownership history lookup failed:",
        err
      );

      const message =
        err?.reason ||
        err?.shortMessage ||
        err?.message ||
        "Unable to retrieve ownership history.";

      if (
        message.includes(
          "Asset does not exist"
        )
      ) {
        setError(
          `Asset Token #${parsedTokenId} does not exist.`
        );
      } else {
        setError(
          `History lookup failed: ${message}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="panel">
      <h2>
        Ownership History & Provenance
      </h2>

      <p className="hint">
        View the chronological
        ownership record of a
        registered PropChain asset
        directly from the smart
        contract.
      </p>

      <div
        style={{
          marginTop: "16px",
          marginBottom: "24px",
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: "12px",
            color: "var(--muted)",
            marginBottom: "8px",
          }}
        >
          Asset Token ID
        </label>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 1"
            value={tokenId}
            onChange={(e) =>
              setTokenId(
                e.target.value
              )
            }
            disabled={loading}
            style={{
              width: "160px",
              margin: 0,
            }}
          />

          <button
            type="button"
            className="btn"
            style={{
              margin: 0,
              padding:
                "10px 24px",
            }}
            onClick={
              handleLookup
            }
            disabled={
              loading ||
              !nftContract
            }
          >
            {loading
              ? "Loading History..."
              : "View Ownership History"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom:
              "18px",
            padding: "12px",
            borderRadius:
              "8px",
            backgroundColor:
              "rgba(127, 29, 29, 0.15)",
            border:
              "1px solid #7f1d1d",
            color: "#fecaca",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            marginTop: "16px",
            borderCollapse:
              "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                borderBottom:
                  "1px solid var(--border)",
              }}
            >
              <th
                style={{
                  padding:
                    "12px 8px",
                  width: "50px",
                }}
              >
                #
              </th>

              <th
                style={{
                  padding:
                    "12px 8px",
                }}
              >
                TYPE
              </th>

              <th
                style={{
                  padding:
                    "12px 8px",
                }}
              >
                PREVIOUS OWNER
              </th>

              <th
                style={{
                  padding:
                    "12px 8px",
                }}
              >
                NEW OWNER
              </th>

              <th
                style={{
                  padding:
                    "12px 8px",
                }}
              >
                PRICE (ETH)
              </th>

              <th
                style={{
                  padding:
                    "12px 8px",
                }}
              >
                TIMESTAMP
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="6"
                  className="empty"
                  style={{
                    padding:
                      "32px",
                    textAlign:
                      "center",
                  }}
                >
                  Loading ownership
                  records...
                </td>
              </tr>
            ) : history.length ===
              0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="empty"
                  style={{
                    padding:
                      "32px",
                    textAlign:
                      "center",
                  }}
                >
                  {searched &&
                  !error
                    ? "No ownership records were found for this asset."
                    : "Enter an Asset Token ID to view its ownership history."}
                </td>
              </tr>
            ) : (
              history.map(
                (item) => (
                  <tr
                    key={
                      item.index
                    }
                    style={{
                      borderBottom:
                        "1px solid var(--border)",
                    }}
                  >
                    <td
                      style={{
                        padding:
                          "12px 8px",
                      }}
                    >
                      {
                        item.index
                      }
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 8px",
                      }}
                    >
                      <span className="badge">
                        {
                          item.type
                        }
                      </span>
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 8px",
                      }}
                    >
                      {item.from ===
                      ethers.ZeroAddress ? (
                        <span
                          style={{
                            color:
                              "var(--muted)",
                          }}
                        >
                          Initial Mint
                        </span>
                      ) : (
                        <code
                          title={
                            item.from
                          }
                        >
                          {truncateAddress(
                            item.from
                          )}
                        </code>
                      )}
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 8px",
                      }}
                    >
                      <code
                        title={
                          item.owner
                        }
                      >
                        {truncateAddress(
                          item.owner
                        )}
                      </code>
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 8px",
                      }}
                    >
                      <b>
                        {
                          item.priceEth
                        }
                      </b>
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 8px",
                        fontSize:
                          "13px",
                        color:
                          "var(--muted)",
                      }}
                    >
                      {
                        item.timestamp
                      }
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OwnershipHistory;