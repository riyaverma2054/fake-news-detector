import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const CHAIN_RPC_URL = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";

export default {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: CHAIN_RPC_URL
    }
  }
};
