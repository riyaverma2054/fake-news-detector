# Headline Truth Recorder (Web3)

A complete React + Smart Contract project that checks whether a news headline is likely true/fake (AI + heuristic fallback), then stores the verdict on a local blockchain.

## Features

- React UI (headline input + verdict card + history list)
- AI verdict using Hugging Face NLI model
- Smart contract (`TruthRecord`) stores headline, verdict, timestamp
- Express backend handles AI check + blockchain write/read
- Hardhat local node + contract deploy

## Prerequisites

- Node 18+ installed
- Git optional

## Setup

1. Open terminal in `C:\Users\HP\Aistamp\fake-news-blockchain`
2. Copy env file:

```bash
cp .env.example .env
```

3. Edit `.env`:

- `HF_API_KEY`: your Hugging Face API key (recommended). If empty, the backend applies lightweight heuristic logic.
- `PRIVATE_KEY`: optional; if blank Hardhat signer is used automatically.

4. Install dependencies:

```bash
npm install
```

## Run (single command)

```bash
npm run dev
```

This runs:

- Hardhat local node
- Contract deploy script (to `deployedAddress.json`)
- Express backend on `http://localhost:4000`
- React frontend on `http://localhost:5173`

## App usage

1. Open `http://localhost:5173`
2. If you want wallet verification, click `Connect Wallet` (MetaMask) and choose the local chain.
3. Enter a headline and click `Check + Server Save`.
4. Optionally click `Save Verdict With Wallet` to store the same record with your connected account.
5. The result appears and is saved on-chain and the history list updates from contract state.

## Wallet integration

- Connect MetaMask to local Hardhat RPC at `http://127.0.0.1:8545`.
- The front-end displays your connected address and network.
- On-chain record count is shown in realtime.

## Contracts

- `contracts/TruthRecord.sol`
- `scripts/deploy.js`

## API endpoints

- `POST /api/check` with `{ headline }` => stores and returns `{ headline, verdict, timestamp }`
- `GET /api/history` => list of records from blockchain
