import React, { useState } from "react";
import { ethers } from "ethers";

export default function RegisterAsset({
  account,
  nftContract,
  refreshStats,
}) {
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("Residential");
  const [floorArea, setFloorArea] = useState("");
  const [registeredValue, setRegisteredValue] = useState("");
  const [documentHash, setDocumentHash] = useState("");
  const [metadataURI, setMetadataURI] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [tokenId, setTokenId] = useState(null);

  const [errors, setErrors] = useState({});

  // ============================================================
  // RESET FORM
  // ============================================================

  const resetForm = () => {
    setLocation("");
    setPropertyType("Residential");
    setFloorArea("");
    setRegisteredValue("");
    setDocumentHash("");
    setMetadataURI("");
    setErrors({});
  };

  // ============================================================
  // CLEAR ONE FIELD ERROR
  // ============================================================

  const clearError = (field) => {
    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  // ============================================================
  // VALIDATE FORM
  // ============================================================

  const validateForm = () => {
    const newErrors = {};

    const cleanLocation = location.trim();
    const cleanDocumentHash = documentHash.trim();
    const cleanMetadataURI = metadataURI.trim();

    // Location
    if (!cleanLocation) {
      newErrors.location =
        "Asset location is required.";
    }

    // Floor area
    const numericFloorArea = Number(floorArea);

    if (floorArea === "") {
      newErrors.floorArea =
        "Floor area is required.";
    } else if (!Number.isFinite(numericFloorArea)) {
      newErrors.floorArea =
        "Floor area must be a valid number.";
    } else if (!Number.isInteger(numericFloorArea)) {
      newErrors.floorArea =
        "Floor area must be a whole number.";
    } else if (numericFloorArea <= 0) {
      newErrors.floorArea =
        "Floor area must be greater than zero.";
    }

    // Registered value
    const numericRegisteredValue =
      Number(registeredValue);

    if (registeredValue === "") {
      newErrors.registeredValue =
        "Registered asset value is required.";
    } else if (
      !Number.isFinite(numericRegisteredValue)
    ) {
      newErrors.registeredValue =
        "Registered asset value must be valid.";
    } else if (numericRegisteredValue <= 0) {
      newErrors.registeredValue =
        "Registered asset value must be greater than zero.";
    }

    // Document hash
    if (!cleanDocumentHash) {
      newErrors.documentHash =
        "Legal document hash or IPFS reference is required.";
    }

    // Metadata URI
    if (!cleanMetadataURI) {
      newErrors.metadataURI =
        "Token metadata JSON URI is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // REGISTER ASSET
  // ============================================================

  const handleRegister = async (event) => {
    event.preventDefault();

    setStatus("");
    setStatusType("");
    setTokenId(null);

    // ----------------------------------------------------------
    // Wallet validation
    // ----------------------------------------------------------

    if (!account) {
      setStatus(
        "Please connect your MetaMask wallet first."
      );
      setStatusType("error");
      return;
    }

    if (!nftContract) {
      setStatus(
        "RealEstateAsset smart contract is not available. Check your blockchain connection."
      );
      setStatusType("error");
      return;
    }

    // ----------------------------------------------------------
    // Frontend validation
    // ----------------------------------------------------------

    const isValid = validateForm();

    if (!isValid) {
      setStatus(
        "Registration rejected. Please correct the highlighted fields before continuing."
      );
      setStatusType("error");

      // IMPORTANT:
      // Return here, so MetaMask is NOT opened.
      return;
    }

    const cleanLocation = location.trim();
    const cleanPropertyType = propertyType.trim();
    const cleanDocumentHash = documentHash.trim();
    const cleanMetadataURI = metadataURI.trim();

    const parsedFloorArea =
      Number(floorArea);

    let registeredValueWei;

    try {
      registeredValueWei =
        ethers.parseEther(
          registeredValue.trim()
        );
    } catch {
      setErrors((previous) => ({
        ...previous,
        registeredValue:
          "Registered asset value is not a valid ETH amount.",
      }));

      setStatus(
        "Registration rejected because the asset value is invalid."
      );

      setStatusType("error");
      return;
    }

    // ----------------------------------------------------------
    // Blockchain transaction
    // ----------------------------------------------------------

    try {
      setLoading(true);
      setActiveStep(1);

      setStatus(
        "Step 1/2: Confirm the asset registration transaction in MetaMask."
      );

      setStatusType("info");

      const tx =
        await nftContract.registerAsset(
          cleanLocation,
          parsedFloorArea,
          cleanPropertyType,
          registeredValueWei,
          cleanDocumentHash,
          cleanMetadataURI,
          0n,
          false
        );

      // --------------------------------------------------------
      // Wait for confirmation
      // --------------------------------------------------------

      setActiveStep(2);

      setStatus(
        "Step 2/2: Transaction submitted. Waiting for blockchain confirmation..."
      );

      const receipt = await tx.wait();

      // --------------------------------------------------------
      // Extract token ID
      // --------------------------------------------------------

      let generatedTokenId = null;

      if (receipt?.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog =
              nftContract.interface.parseLog(log);

            if (
              parsedLog &&
              parsedLog.name === "AssetRegistered"
            ) {
              generatedTokenId =
                parsedLog.args.tokenId.toString();

              break;
            }
          } catch {
            // Ignore unrelated ERC-721 logs
          }
        }
      }

      // --------------------------------------------------------
      // Success
      // --------------------------------------------------------

      if (generatedTokenId) {
        setTokenId(generatedTokenId);

        setStatus(
          `Digital asset #${generatedTokenId} was successfully registered and minted on-chain.`
        );
      } else {
        setStatus(
          "Digital asset was successfully registered and minted on-chain."
        );
      }

      setStatusType("success");

      resetForm();

      if (
        typeof refreshStats === "function"
      ) {
        await refreshStats();
      }
    } catch (error) {
      console.error(
        "Asset registration failed:",
        error
      );

      const errorMessage =
        error?.reason ||
        error?.shortMessage ||
        error?.message ||
        "Unknown blockchain error.";

      if (
        errorMessage
          .toLowerCase()
          .includes("user rejected") ||
        errorMessage
          .toLowerCase()
          .includes("user denied")
      ) {
        setStatus(
          "Transaction cancelled. MetaMask approval was rejected."
        );
      } else {
        setStatus(
          `Registration failed: ${errorMessage}`
        );
      }

      setStatusType("error");
    } finally {
      setLoading(false);
      setActiveStep(0);
    }
  };

  // ============================================================
  // INPUT STYLE WITH VALIDATION
  // ============================================================

  const getInputStyle = (field) => ({
    ...styles.input,
    borderColor: errors[field]
      ? "#ef4444"
      : "#334155",
  });

  // ============================================================
  // UI
  // ============================================================

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.badge}>
          PROPCHAIN OPEN REGISTRY
        </div>

        <h2 style={styles.title}>
          Register Digital Asset
        </h2>

        <p style={styles.subtitle}>
          Register and mint a blockchain token
          representing a real-estate digital asset.
        </p>
      </div>

      <div style={styles.card}>
        <form
          onSubmit={handleRegister}
          style={styles.form}

          // IMPORTANT:
          // Disable native browser validation so that
          // our React validation always handles errors.
          noValidate
        >
          {/* ================================================= */}
          {/* LOCATION */}
          {/* ================================================= */}

          <div>
            <label style={styles.label}>
              Asset Description / Physical Location *
            </label>

            <input
              type="text"
              placeholder="e.g. No. 45, Galle Road, Colombo 03, Sri Lanka"
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                clearError("location");
              }}
              disabled={loading}
              style={getInputStyle("location")}
            />

            {errors.location && (
              <div style={styles.errorText}>
                {errors.location}
              </div>
            )}
          </div>

          {/* ================================================= */}
          {/* TYPE + FLOOR AREA */}
          {/* ================================================= */}

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>
                Asset Type *
              </label>

              <select
                value={propertyType}
                onChange={(event) =>
                  setPropertyType(
                    event.target.value
                  )
                }
                disabled={loading}
                style={styles.input}
              >
                <option value="Residential">
                  Residential
                </option>

                <option value="Commercial">
                  Commercial
                </option>

                <option value="Industrial">
                  Industrial
                </option>

                <option value="Land / Plot">
                  Land / Plot
                </option>
              </select>
            </div>

            <div>
              <label style={styles.label}>
                Floor Area (Sq Ft) *
              </label>

              <input
                type="number"
                step="1"
                placeholder="e.g. 1850"
                value={floorArea}
                onChange={(event) => {
                  setFloorArea(
                    event.target.value
                  );

                  clearError("floorArea");
                }}
                disabled={loading}
                style={getInputStyle(
                  "floorArea"
                )}
              />

              {errors.floorArea && (
                <div style={styles.errorText}>
                  {errors.floorArea}
                </div>
              )}
            </div>
          </div>

          {/* ================================================= */}
          {/* REGISTERED VALUE */}
          {/* ================================================= */}

          <div>
            <label style={styles.label}>
              Registered Asset Value (ETH) *
            </label>

            <input
              type="number"
              step="any"
              placeholder="e.g. 100"
              value={registeredValue}
              onChange={(event) => {
                setRegisteredValue(
                  event.target.value
                );

                clearError(
                  "registeredValue"
                );
              }}
              disabled={loading}
              style={getInputStyle(
                "registeredValue"
              )}
            />

            {errors.registeredValue && (
              <div style={styles.errorText}>
                {errors.registeredValue}
              </div>
            )}

            <div style={styles.helpText}>
              Reference value recorded with the
              digital asset. This is not the
              marketplace sale price.
            </div>
          </div>

          {/* ================================================= */}
          {/* DOCUMENT HASH */}
          {/* ================================================= */}

          <div>
            <label style={styles.label}>
              Legal Document Hash / IPFS Reference *
            </label>

            <input
              type="text"
              placeholder="e.g. QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
              value={documentHash}
              onChange={(event) => {
                setDocumentHash(
                  event.target.value
                );

                clearError(
                  "documentHash"
                );
              }}
              disabled={loading}
              style={getInputStyle(
                "documentHash"
              )}
            />

            {errors.documentHash && (
              <div style={styles.errorText}>
                {errors.documentHash}
              </div>
            )}

            <div style={styles.helpText}>
              Enter the hash or IPFS reference
              associated with the asset documentation.
            </div>
          </div>

          {/* ================================================= */}
          {/* METADATA URI */}
          {/* ================================================= */}

          <div>
            <label style={styles.label}>
              Token Metadata JSON URI *
            </label>

            <input
              type="text"
              placeholder="e.g. ipfs://Qm.../metadata.json"
              value={metadataURI}
              onChange={(event) => {
                setMetadataURI(
                  event.target.value
                );

                clearError(
                  "metadataURI"
                );
              }}
              disabled={loading}
              style={getInputStyle(
                "metadataURI"
              )}
            />

            {errors.metadataURI && (
              <div style={styles.errorText}>
                {errors.metadataURI}
              </div>
            )}

            <div style={styles.helpText}>
              URI containing the ERC-721 token metadata.
            </div>
          </div>

          {/* ================================================= */}
          {/* INITIAL STATUS */}
          {/* ================================================= */}

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>
              Initial Marketplace Status
            </div>

            <div style={styles.infoValue}>
              UNLISTED
            </div>

            <div style={styles.infoText}>
              After registration, the owner can
              list this asset for sale from My Assets.
            </div>
          </div>

          {/* ================================================= */}
          {/* SUBMIT */}
          {/* ================================================= */}

          <button
            type="submit"
            disabled={
              loading ||
              !account ||
              !nftContract
            }
            style={{
              ...styles.submitButton,

              opacity:
                loading ||
                !account ||
                !nftContract
                  ? 0.55
                  : 1,

              cursor:
                loading ||
                !account ||
                !nftContract
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Registering Asset..."
              : "Mint Digital Asset Token"}
          </button>

          {!account && (
            <div style={styles.walletWarning}>
              Connect MetaMask before
              registering an asset.
            </div>
          )}
        </form>
      </div>

      {/* ===================================================== */}
      {/* TRANSACTION PROGRESS */}
      {/* ===================================================== */}

      {loading && (
        <div style={styles.progressPanel}>
          <div style={styles.progressTitle}>
            Blockchain Transaction Progress
          </div>

          <div style={styles.steps}>
            <div
              style={{
                ...styles.step,

                borderColor:
                  activeStep >= 1
                    ? "#38bdf8"
                    : "#334155",
              }}
            >
              <strong>1</strong>
              <span>
                MetaMask Approval
              </span>
            </div>

            <div
              style={{
                ...styles.step,

                borderColor:
                  activeStep >= 2
                    ? "#38bdf8"
                    : "#334155",
              }}
            >
              <strong>2</strong>
              <span>
                Blockchain Confirmation
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* STATUS */}
      {/* ===================================================== */}

      {status && (
        <div
          style={{
            ...styles.statusBox,

            borderColor:
              statusType === "success"
                ? "#10b981"
                : statusType === "error"
                ? "#ef4444"
                : "#38bdf8",

            backgroundColor:
              statusType === "success"
                ? "rgba(16,185,129,0.08)"
                : statusType === "error"
                ? "rgba(239,68,68,0.08)"
                : "rgba(56,189,248,0.08)",
          }}
        >
          <div style={styles.statusText}>
            {status}
          </div>

          {tokenId && (
            <div style={styles.tokenBadge}>
              Token ID #{tokenId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  container: {
    maxWidth: "650px",
    margin: "0 auto",
    padding: "20px 16px",
  },

  header: {
    textAlign: "center",
    marginBottom: "26px",
  },

  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "20px",
    background:
      "rgba(56,189,248,0.1)",
    border:
      "1px solid rgba(56,189,248,0.25)",
    color: "#38bdf8",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1px",
    marginBottom: "10px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "28px",
    fontWeight: "800",
    color: "#f8fafc",
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
  },

  card: {
    background:
      "rgba(15,23,42,0.8)",
    border:
      "1px solid #334155",
    borderRadius: "16px",
    padding: "28px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "19px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },

  label: {
    display: "block",
    color: "#cbd5e1",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: "7px",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    background: "#0f172a",
    border:
      "1px solid #334155",
    borderRadius: "8px",
    color: "#f8fafc",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  },

  errorText: {
    color: "#f87171",
    fontSize: "11px",
    marginTop: "6px",
    fontWeight: "600",
  },

  helpText: {
    color: "#64748b",
    fontSize: "10px",
    marginTop: "6px",
  },

  infoBox: {
    padding: "12px 14px",
    borderRadius: "8px",
    background:
      "rgba(16,185,129,0.06)",
    border:
      "1px solid rgba(16,185,129,0.2)",
  },

  infoTitle: {
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "700",
    textTransform:
      "uppercase",
  },

  infoValue: {
    color: "#10b981",
    fontSize: "13px",
    fontWeight: "800",
    marginTop: "3px",
  },

  infoText: {
    color: "#64748b",
    fontSize: "10px",
    marginTop: "3px",
  },

  submitButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "9px",
    background:
      "linear-gradient(135deg,#0284c7,#2563eb)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    marginTop: "4px",
  },

  walletWarning: {
    color: "#f59e0b",
    textAlign: "center",
    fontSize: "11px",
  },

  progressPanel: {
    marginTop: "18px",
    padding: "16px",
    background:
      "rgba(15,23,42,0.7)",
    border:
      "1px solid #334155",
    borderRadius: "12px",
  },

  progressTitle: {
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: "700",
    textTransform:
      "uppercase",
    marginBottom: "10px",
  },

  steps: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "8px",
  },

  step: {
    padding: "10px",
    border:
      "1px solid #334155",
    borderRadius: "7px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    color: "#cbd5e1",
    fontSize: "10px",
  },

  statusBox: {
    marginTop: "18px",
    padding: "16px",
    border: "1px solid",
    borderRadius: "10px",
    textAlign: "center",
  },

  statusText: {
    color: "#e2e8f0",
    fontSize: "12px",
    wordBreak: "break-word",
  },

  tokenBadge: {
    display: "inline-block",
    marginTop: "9px",
    padding: "5px 10px",
    borderRadius: "6px",
    background: "#10b981",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "800",
  },
};