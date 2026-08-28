import React from "react";

export default function Dashboard({ stats }) {
  const totalAssets =
    stats?.totalAssets ?? "0";

  const totalTransactions =
    stats?.totalTransactions ?? "0";

  const knownHolders =
    stats?.knownHolders ?? "0";

  return (
    <div style={styles.gridContainer}>
      <div style={styles.card}>
        <div style={styles.label}>
          TOTAL ASSETS CREATED
        </div>

        <div style={styles.value}>
          {totalAssets}
        </div>

        <div style={styles.subtext}>
          Minted ERC-721 Property Tokens
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.label}>
          TOTAL TRANSACTIONS
        </div>

        <div style={styles.value}>
          {totalTransactions}
        </div>

        <div style={styles.subtext}>
          On-Chain Asset Creations and Ownership Changes
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.label}>
          KNOWN ASSET HOLDERS
        </div>

        <div style={styles.value}>
          {knownHolders}
        </div>

        <div style={styles.subtext}>
          Wallets That Have Held Registered Assets
        </div>
      </div>
    </div>
  );
}

const styles = {
  gridContainer: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  card: {
    backgroundColor:
      "rgba(15, 22, 33, 0.75)",
    backdropFilter: "blur(16px)",
    border:
      "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    boxShadow:
      "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
  },

  label: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  },

  value: {
    fontFamily:
      "'Space Grotesk', sans-serif",
    fontSize: "32px",
    fontWeight: "700",
    color: "#3ddc97",
    letterSpacing: "-0.5px",
  },

  subtext: {
    fontSize: "12px",
    color: "#64748b",
    lineHeight: "1.4",
  },
};