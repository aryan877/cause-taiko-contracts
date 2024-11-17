import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const TAIKO_RPC_URL = "https://rpc.hekla.taiko.xyz";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    "taiko-hekla": {
      url: TAIKO_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      "taiko-hekla": ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "taiko-hekla",
        chainId: 167009,
        urls: {
          apiURL: "https://explorer.hekla.taiko.xyz/api",
          browserURL: "https://explorer.hekla.taiko.xyz",
        },
      },
    ],
  },
};

export default config;
