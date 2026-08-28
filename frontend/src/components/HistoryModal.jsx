import React, {
  useState,
  useEffect,
} from "react";

import { ethers } from "ethers";

export default function HistoryModal({
  tokenId,
  nftContract,
  onClose,
}) {
  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ============================================================
  // HELPERS
  // ============================================================

  const truncateAddress = (
    address
  ) => {
    if (!address) {
      return "";
    }

    return `${address.slice(
      0,
      6
    )}...${address.slice(-4)}`;
  };

  const getRecordType = (
    record
  ) => {
    if (
      record.from ===
      ethers.ZeroAddress
    ) {
      return "Mint / Registration";
    }

    if (record.price > 0n) {
      return "Sale / Purchase";
    }

    return "Direct Transfer";
  };

  // ============================================================
  // LOAD HISTORY
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const fetchHistory =
      async () => {
        if (
          !nftContract ||
          tokenId === null ||
          tokenId === undefined
        ) {
          return;
        }

        try {
          setLoading(true);
          setError("");

          if (
            typeof nftContract.getOwnershipHistory !==
            "function"
          ) {
            throw new Error(
              "Ownership history function is unavailable."
            );
          }

          const records =
            await nftContract.getOwnershipHistory(
              tokenId
            );

          const formatted =
            records.map(
              (
                record,
                index
              ) => ({
                index:
                  index + 1,

                type:
                  getRecordType(
                    record
                  ),

                from:
                  record.from,

                to:
                  record.to,

                priceEth:
                  record.price >
                  0n
                    ? ethers.formatEther(
                        record.price
                      )
                    : null,

                timestamp:
                  record.timestamp >
                  0n
                    ? new Date(
                        Number(
                          record.timestamp
                        ) *
                          1000
                      ).toLocaleString()
                    : "N/A",
              })
            );

          if (!cancelled) {
            setHistory(
              formatted
            );
          }
        } catch (err) {
          console.error(
            "Error loading ownership history:",
            err
          );

          if (!cancelled) {
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
                `Asset #${tokenId} does not exist.`
              );
            } else {
              setError(
                `History lookup failed: ${message}`
              );
            }

            setHistory([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [
    tokenId,
    nftContract,
  ]);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            Ownership History —
            Asset #{tokenId}
          </h3>

          <button
            type="button"
            onClick={onClose}
            style={
              styles.closeBtn
            }
          >
            Close
          </button>
        </div>

        {loading ? (
          <div
            style={
              styles.loading
            }
          >
            Loading on-chain
            ownership records...
          </div>
        ) : error ? (
          <div
            style={styles.error}
          >
            {error}
          </div>
        ) : history.length ===
          0 ? (
          <div
            style={
              styles.empty
            }
          >
            No ownership records
            found for this asset.
          </div>
        ) : (
          <div
            style={
              styles.timeline
            }
          >
            {history.map(
              (record) => (
                <div
                  key={
                    record.index
                  }
                  style={
                    styles.timelineItem
                  }
                >
                  <div
                    style={
                      styles.timelineIndex
                    }
                  >
                    {
                      record.index
                    }
                  </div>

                  <div
                    style={
                      styles.timelineContent
                    }
                  >
                    <div
                      style={
                        styles.type
                      }
                    >
                      {
                        record.type
                      }
                    </div>

                    <div
                      style={
                        styles.ownerAddress
                      }
                    >
                      {record.from ===
                      ethers.ZeroAddress
                        ? `Initial Mint → ${truncateAddress(
                            record.to
                          )}`
                        : `${truncateAddress(
                            record.from
                          )} → ${truncateAddress(
                            record.to
                          )}`}
                    </div>

                    <div
                      style={
                        styles.metaRow
                      }
                    >
                      <span>
                        {
                          record.timestamp
                        }
                      </span>

                      <span
                        style={{
                          color:
                            record.priceEth
                              ? "#10b981"
                              : "#94a3b8",
                        }}
                      >
                        {record.priceEth
                          ? `${record.priceEth} ETH`
                          : "No Sale Price"}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      "rgba(0, 0, 0, 0.75)",
    backdropFilter:
      "blur(4px)",
    display: "flex",
    justifyContent:
      "center",
    alignItems: "center",
    zIndex: 1000,
  },

  modal: {
    backgroundColor:
      "#0f172a",
    border:
      "1px solid #334155",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "540px",
    maxHeight: "80vh",
    overflowY: "auto",
    padding: "24px",
    boxShadow:
      "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom:
      "1px solid #334155",
  },

  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#f8fafc",
  },

  closeBtn: {
    background: "none",
    border:
      "1px solid #475569",
    borderRadius: "6px",
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "6px 10px",
  },

  loading: {
    textAlign: "center",
    padding: "30px 0",
    color: "#38bdf8",
    fontSize: "14px",
  },

  empty: {
    textAlign: "center",
    padding: "30px 0",
    color: "#64748b",
    fontSize: "14px",
  },

  error: {
    textAlign: "center",
    padding: "18px",
    color: "#fecaca",
    backgroundColor:
      "rgba(127, 29, 29, 0.15)",
    border:
      "1px solid #7f1d1d",
    borderRadius: "8px",
    fontSize: "13px",
  },

  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  timelineItem: {
    display: "flex",
    gap: "12px",
    backgroundColor:
      "#020617",
    padding: "12px",
    borderRadius: "8px",
    border:
      "1px solid #1e293b",
    alignItems: "center",
  },

  timelineIndex: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor:
      "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    fontSize: "12px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    flexShrink: 0,
  },

  timelineContent: {
    flex: 1,
    overflow: "hidden",
  },

  type: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#38bdf8",
    marginBottom: "4px",
  },

  ownerAddress: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#f1f5f9",
    fontFamily:
      "monospace",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow:
      "ellipsis",
  },

  metaRow: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: "12px",
    flexWrap: "wrap",
    fontSize: "11px",
    color: "#64748b",
    marginTop: "4px",
  },
};