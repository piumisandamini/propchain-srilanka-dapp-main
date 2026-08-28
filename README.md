# PropChain — Real Estate NFT Marketplace & Registry

## Project layout
```
backend/     Hardhat project — Solidity contracts, deploy script
frontend/    Create React App — MetaMask-connected dashboard
```

## 1. Backend — install, compile, deploy
```bash
cd backend
npm install
npx hardhat compile
npx hardhat node          # in one terminal — local chain on :8545
npx hardhat run scripts/deploy.js --network localhost   # in a second terminal
```
Copy the two addresses it prints into `frontend/src/config.js`
(`REAL_ESTATE_ASSET_ADDRESS` and `REAL_ESTATE_MARKETPLACE_ADDRESS`), and copy the
freshly compiled ABIs from `backend/artifacts/contracts/**/*.json` into
`frontend/src/abis/` (matching filenames), replacing the ones already there.

## 2. Frontend — install and run
```bash
cd frontend
npm install
npm start
```
Open the app, connect MetaMask to your local Hardhat network (chain id
`31337`), and import one of the funded private keys `npx hardhat node`
prints so you have ETH to test with.

## What changed in this cleanup
This folder was cleaned up from a working copy that had several real bugs:

- **Backend**: `hardhat.config.js` was missing its `export default`, so
  Hardhat couldn't load the config at all. `RealEstateAsset.sol` had two
  incomplete `override(...)` lists (`_update` and `supportsInterface`),
  which are Solidity compile errors when combining `ERC721Enumerable`,
  `ERC721URIStorage`, and `AccessControl`.
- **Frontend**: `frontend/src/abis/RealEstateAsset.json` was missing
  entirely, even though it was imported in two places. Several components
  called contract functions/events that don't exist on the real contracts
  (`getPropertyDetails` instead of `getProperty`, `setPlatformFeeBps`
  instead of `setFee`, `ItemSold`/`ItemListed` instead of
  `PropertySold`/`PropertyListed`, etc.) — these broke the Marketplace tab,
  My Properties tab, and the entire Admin panel. `App.js` never imported
  `App.css`, and `public/index.html` had a large leftover block of static
  mock markup plus a `<script src="app.js">` tag pointing at a file that
  doesn't exist (a guaranteed 404 in the browser console).
- **Removed**: `node_modules/` (both projects), two nested `.git` histories,
  Hardhat's `artifacts/`/`cache/` build output, the unused default
  `ignition/` example, a couple of stray `package.json` files accidentally
  created inside `frontend/src/abis/`, and a few unused/dead components and
  assets that weren't wired into the app.

## Known limitation
The "Known Holders" number on the main dashboard will always show `—`,
because `RealEstateMarketplace.sol` doesn't track a holder list on-chain.
The **Top Holders** tab works correctly — it computes the leaderboard
client-side from `Transfer` events instead. Adding on-chain holder tracking
would be a contract change, not a bug fix, so it was left as-is.
