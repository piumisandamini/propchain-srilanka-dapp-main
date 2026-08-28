import React from "react";
import logoImg from "../assets/logo.png";

export default function Navbar({
  account,
  connectWallet,
}) {
  const truncateAddress = (address) => {
    if (!address) {
      return "";
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header
      className="navbar-header"
      style={styles.navbar}
    >
      <div
        className="brand"
        style={styles.brand}
      >
        <img
          src={logoImg}
          alt="PropChain Logo"
          style={styles.logoImage}
        />

        <span style={styles.brandText}>
          PropChain
        </span>
      </div>

      <div
        className="header-actions"
        style={styles.headerActions}
      >
        {account ? (
          <div
            id="account"
            title={`Connected wallet: ${account}`}
            aria-label={`Connected wallet ${account}`}
            style={styles.accountChip}
          >
            <span
              style={styles.statusDot}
              aria-hidden="true"
            />

            <span style={styles.walletLabel}>
              Connected
            </span>

            <code>
              {truncateAddress(account)}
            </code>
          </div>
        ) : (
          <button
            id="connectBtn"
            className="btn"
            style={styles.connectBtn}
            onClick={connectWallet}
            type="button"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "16px 24px",
    backgroundColor:
      "rgba(15, 22, 33, 0.85)",
    backdropFilter: "blur(16px)",
    border:
      "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  logoImage: {
    width: "38px",
    height: "38px",
    objectFit: "contain",
    borderRadius: "8px",
  },

  brandText: {
    fontFamily:
      "'Space Grotesk', sans-serif",
    fontSize: "20px",
    fontWeight: "700",
    color: "#f1f5f9",
    letterSpacing: "-0.5px",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  accountChip: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "10px",
    backgroundColor: "#020617",
    border: "1px solid #1e293b",
    fontSize: "13px",
    color: "#cbd5e1",
  },

  walletLabel: {
    fontSize: "12px",
    color: "#94a3b8",
  },

  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#3ddc97",
  },

  connectBtn: {
    padding: "9px 18px",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg, #3ddc97 0%, #2563eb 100%)",
    border: "none",
    color: "#07090e",
    fontWeight: "700",
    fontSize: "13.5px",
    cursor: "pointer",
  },
};