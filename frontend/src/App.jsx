import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import "./App.css";

// Components
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import RegisterAsset from "./components/RegisterAsset";
import AssetActions from "./components/AssetActions";
import OwnershipHistory from "./components/OwnershipHistory";
import TopHolders from "./components/TopHolders";
import HistoryModal from "./components/HistoryModal";

// Web3 utilities
import {
  connectWallet as web3ConnectWallet,
  initWeb3Contracts,
  getEthereumProvider,
} from "./utils/web3";

function App() {
  const [account, setAccount] =
    useState(null);

  const [assetContract, setAssetContract] =
    useState(null);

  const [activeTab, setActiveTab] =
    useState("marketplace");

  const [
    selectedTokenIdForModal,
    setSelectedTokenIdForModal,
  ] = useState(null);

  const [stats, setStats] = useState({
    totalAssets: "0",
    totalTransactions: "0",
    knownHolders: "0",
  });

  // PropChain is open to all connected users
  const canRegisterAssets = true;

  // ============================================================
  // PLATFORM STATISTICS
  // ============================================================

  const fetchPlatformStats =
    useCallback(async (assetInst) => {
      if (!assetInst) {
        setStats({
          totalAssets: "0",
          totalTransactions: "0",
          knownHolders: "0",
        });

        return;
      }

      try {
        let totalAssets = "0";
        let totalTransactions = "0";
        let knownHolders = "0";

        if (
          typeof assetInst.getTotalAssetsCreated ===
          "function"
        ) {
          const assets =
            await assetInst.getTotalAssetsCreated();

          totalAssets =
            assets.toString();
        } else if (
          typeof assetInst.totalSupply ===
          "function"
        ) {
          const assets =
            await assetInst.totalSupply();

          totalAssets =
            assets.toString();
        }

        if (
          typeof assetInst.totalTransactions ===
          "function"
        ) {
          const transactions =
            await assetInst.totalTransactions();

          totalTransactions =
            transactions.toString();
        }

        if (
          typeof assetInst.getKnownHolderCount ===
          "function"
        ) {
          const holders =
            await assetInst.getKnownHolderCount();

          knownHolders =
            holders.toString();
        }

        setStats({
          totalAssets,
          totalTransactions,
          knownHolders,
        });
      } catch (error) {
        console.warn(
          "Unable to load blockchain statistics:",
          error
        );
      }
    }, []);

  // ============================================================
  // WEB3 INITIALIZATION
  // ============================================================

  const initializeApp =
    useCallback(async () => {
      try {
        const {
          account: activeAccount,
          assetContract: activeAssetContract,
        } = await initWeb3Contracts();

        setAccount(activeAccount);
        setAssetContract(
          activeAssetContract
        );

        await fetchPlatformStats(
          activeAssetContract
        );

        return {
          account: activeAccount,
          assetContract:
            activeAssetContract,
        };
      } catch (error) {
        console.warn(
          "Blockchain initialization failed:",
          error
        );

        setAssetContract(null);

        throw error;
      }
    }, [fetchPlatformStats]);

  // ============================================================
  // WALLET CONNECTION
  // ============================================================

  const handleConnectWallet =
    async () => {
      try {
        await web3ConnectWallet();

        await initializeApp();
      } catch (error) {
        console.error(
          "Wallet connection failed:",
          error
        );

        alert(
          `Wallet connection failed: ${error.message}`
        );
      }
    };

  // ============================================================
  // REFRESH APPLICATION DATA
  // ============================================================

  const refreshAppData =
    useCallback(async () => {
      if (!assetContract) {
        return;
      }

      await fetchPlatformStats(
        assetContract
      );
    }, [
      assetContract,
      fetchPlatformStats,
    ]);

  // ============================================================
  // DETECT EXISTING WALLET CONNECTION
  // ============================================================

  useEffect(() => {
    const detectExistingConnection =
      async () => {
        const ethereum =
          getEthereumProvider();

        if (!ethereum) {
          return;
        }

        try {
          const accounts =
            await ethereum.request({
              method: "eth_accounts",
            });

          if (
            accounts &&
            accounts.length > 0
          ) {
            await initializeApp();
          }
        } catch (error) {
          console.warn(
            "Unable to restore wallet connection:",
            error
          );
        }
      };

    detectExistingConnection();
  }, [initializeApp]);

  // ============================================================
  // METAMASK EVENTS
  // ============================================================

  useEffect(() => {
    const ethereum =
      getEthereumProvider();

    if (
      !ethereum ||
      typeof ethereum.on !==
        "function"
    ) {
      return undefined;
    }

    const handleAccountsChanged =
      async (accounts) => {
        if (
          !accounts ||
          accounts.length === 0
        ) {
          setAccount(null);
          setAssetContract(null);

          setStats({
            totalAssets: "0",
            totalTransactions: "0",
            knownHolders: "0",
          });

          setSelectedTokenIdForModal(
            null
          );

          return;
        }

        try {
          await initializeApp();
        } catch (error) {
          console.warn(
            "Failed to reload application after account change:",
            error
          );
        }
      };

    const handleChainChanged = () => {
      /*
       * Reloading is the safest approach because
       * Ethers BrowserProvider caches network information.
       */
      window.location.reload();
    };

    ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    ethereum.on(
      "chainChanged",
      handleChainChanged
    );

    return () => {
      if (
        typeof ethereum.removeListener ===
        "function"
      ) {
        ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );

        ethereum.removeListener(
          "chainChanged",
          handleChainChanged
        );
      }
    };
  }, [initializeApp]);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="wrap">
      <Navbar
        account={account}
        connectWallet={
          handleConnectWallet
        }
      />

      <Dashboard stats={stats} />

      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${
            activeTab === "marketplace"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab(
              "marketplace"
            )
          }
        >
          All Assets
        </button>

        <button
          type="button"
          className={`tab-btn ${
            activeTab === "register"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("register")
          }
        >
          Register Asset
        </button>

        <button
          type="button"
          className={`tab-btn ${
            activeTab ===
            "my-properties"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab(
              "my-properties"
            )
          }
        >
          My Assets
        </button>

        <button
          type="button"
          className={`tab-btn ${
            activeTab === "holders"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("holders")
          }
        >
          Top Holders
        </button>

        <button
          type="button"
          className={`tab-btn ${
            activeTab === "history"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("history")
          }
        >
          Ownership History
        </button>
      </div>

      <main>
        {!account ? (
          <div
            className="panel"
            style={{
              textAlign: "center",
              padding:
                "64px 20px",
            }}
          >
            <h2>
              Decentralized Digital
              Asset Marketplace
            </h2>

            <p
              className="hint"
              style={{
                fontSize: "14px",
                maxWidth: "600px",
                margin:
                  "0 auto 28px",
              }}
            >
              Define, tokenize,
              purchase, transfer,
              and sell digital
              assets on the
              blockchain through
              wallet-authorized
              transactions.
            </p>

            <button
              type="button"
              className="btn"
              onClick={
                handleConnectWallet
              }
            >
              Connect Wallet to
              Continue
            </button>
          </div>
        ) : (
          <>
            {activeTab ===
              "marketplace" && (
              <section className="tab-content">
                <AssetActions
                  key="marketplace-view"
                  account={account}
                  nftContract={
                    assetContract
                  }
                  filter="all"
                  onViewHistory={(
                    tokenId
                  ) =>
                    setSelectedTokenIdForModal(
                      tokenId
                    )
                  }
                  refreshStats={
                    refreshAppData
                  }
                />
              </section>
            )}

            {activeTab ===
              "register" && (
              <section className="tab-content">
                <RegisterAsset
                  account={account}
                  nftContract={
                    assetContract
                  }
                  isRegistrar={
                    canRegisterAssets
                  }
                  refreshStats={
                    refreshAppData
                  }
                />
              </section>
            )}

            {activeTab ===
              "my-properties" && (
              <section className="tab-content">
                <AssetActions
                  key="my-properties-view"
                  account={account}
                  nftContract={
                    assetContract
                  }
                  filter="mine"
                  onViewHistory={(
                    tokenId
                  ) =>
                    setSelectedTokenIdForModal(
                      tokenId
                    )
                  }
                  refreshStats={
                    refreshAppData
                  }
                />
              </section>
            )}

            {activeTab ===
              "holders" && (
              <section className="tab-content">
                <TopHolders
                  nftContract={
                    assetContract
                  }
                />
              </section>
            )}

            {activeTab ===
              "history" && (
              <section className="tab-content">
                <OwnershipHistory
                  nftContract={
                    assetContract
                  }
                />
              </section>
            )}
          </>
        )}
      </main>

      {selectedTokenIdForModal !==
        null && (
        <HistoryModal
          tokenId={
            selectedTokenIdForModal
          }
          nftContract={
            assetContract
          }
          onClose={() =>
            setSelectedTokenIdForModal(
              null
            )
          }
        />
      )}
    </div>
  );
}

export default App;