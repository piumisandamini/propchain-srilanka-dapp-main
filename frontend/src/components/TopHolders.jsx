import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

export default function TopHolders({
  nftContract,
}) {
  const [loading, setLoading] =
    useState(false);

  const [topHolders, setTopHolders] =
    useState([]);

  const [error, setError] =
    useState("");

  // ============================================================
  // LOAD TOP 10 HOLDERS FROM SMART CONTRACT
  // ============================================================

  const fetchTopHolders =
    useCallback(async () => {
      if (!nftContract) {
        setTopHolders([]);
        return;
      }

      try {
        setLoading(true);
        setError("");

        if (
          typeof nftContract.getTopHolders !==
          "function"
        ) {
          throw new Error(
            "getTopHolders() is not available in the current smart contract."
          );
        }

        const [holders, balances] =
          await nftContract.getTopHolders(10);

        const formattedHolders =
          holders.map(
            (wallet, index) => ({
              wallet,
              assetCount: Number(
                balances[index]
              ),
            })
          );

        setTopHolders(
          formattedHolders
        );
      } catch (err) {
        console.error(
          "Error fetching top holders:",
          err
        );

        setTopHolders([]);

        setError(
          err?.reason ||
            err?.shortMessage ||
            err?.message ||
            "Unable to retrieve holder information."
        );
      } finally {
        setLoading(false);
      }
    }, [nftContract]);

  // ============================================================
  // INITIAL LOAD + LIVE TRANSFER REFRESH
  // ============================================================

  useEffect(() => {
    fetchTopHolders();

    if (!nftContract) {
      return undefined;
    }

    const handleTransfer = () => {
      fetchTopHolders();
    };

    try {
      nftContract.on(
        "Transfer",
        handleTransfer
      );
    } catch (err) {
      console.warn(
        "Unable to attach Transfer event listener:",
        err
      );
    }

    return () => {
      try {
        nftContract.off(
          "Transfer",
          handleTransfer
        );
      } catch {
        // Ignore listener cleanup errors
      }
    };
  }, [
    nftContract,
    fetchTopHolders,
  ]);

  // ============================================================
  // ADDRESS FORMATTER
  // ============================================================

  const truncateAddress = (
    wallet
  ) => {
    if (!wallet) {
      return "";
    }

    return `${wallet.slice(
      0,
      8
    )}...${wallet.slice(-6)}`;
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      className="panel"
      style={{
        width: "100%",
        margin: "0 auto",
      }}
    >
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "700",
          marginBottom: "8px",
        }}
      >
        Top 10 Asset Holders
      </h2>

      <p
        className="hint"
        style={{
          marginBottom: "24px",
        }}
      >
        Ranked view of wallets
        currently holding the
        highest number of registered
        PropChain asset tokens.
      </p>

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            borderRadius: "8px",
            border:
              "1px solid #7f1d1d",
            backgroundColor:
              "rgba(127, 29, 29, 0.15)",
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
            borderCollapse:
              "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom:
                  "1px solid var(--border)",
                textAlign: "left",
              }}
            >
              <th
                style={{
                  width: "100px",
                  padding:
                    "12px 8px",
                }}
              >
                RANK
              </th>

              <th
                style={{
                  padding:
                    "12px 8px",
                }}
              >
                WALLET ADDRESS
              </th>

              <th
                style={{
                  padding:
                    "12px 8px",
                }}
              >
                ASSETS HELD
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="3"
                  className="empty"
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "32px 0",
                  }}
                >
                  Loading holder
                  rankings...
                </td>
              </tr>
            ) : topHolders.length >
              0 ? (
              topHolders.map(
                (
                  holder,
                  index
                ) => (
                  <tr
                    key={
                      holder.wallet
                    }
                    style={{
                      borderBottom:
                        "1px solid var(--border)",
                    }}
                  >
                    <td
                      style={{
                        fontWeight:
                          "700",
                        color:
                          "var(--accent)",
                        padding:
                          "12px 8px",
                      }}
                    >
                      #{index + 1}
                    </td>

                    <td
                      style={{
                        padding:
                          "12px 8px",
                      }}
                    >
                      <code
                        title={
                          holder.wallet
                        }
                      >
                        {truncateAddress(
                          holder.wallet
                        )}
                      </code>
                    </td>

                    <td
                      style={{
                        fontWeight:
                          "700",
                        padding:
                          "12px 8px",
                      }}
                    >
                      {
                        holder.assetCount
                      }{" "}
                      {holder.assetCount ===
                      1
                        ? "Asset"
                        : "Assets"}
                    </td>
                  </tr>
                )
              )
            ) : (
              <tr>
                <td
                  colSpan="3"
                  className="empty"
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "32px 0",
                  }}
                >
                  No active asset
                  holders are currently
                  recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}