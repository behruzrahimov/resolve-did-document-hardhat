import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ganache";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();
const PROVIDER_URL = process.env.PROVIDER_URL;
const PRIVATE_KEY1 = process.env.PRIVATE_KEY1;
const PRIVATE_KEY2 = process.env.PRIVATE_KEY2;
const PRIVATE_KEY3 = process.env.PRIVATE_KEY3;
const PRIVATE_KEY4 = process.env.PRIVATE_KEY4;
const PRIVATE_KEY5 = process.env.PRIVATE_KEY5;
const PRIVATE_KEY6 = process.env.PRIVATE_KEY6;
const PRIVATE_KEY7 = process.env.PRIVATE_KEY7;

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    localganache: {
      url: PROVIDER_URL,
      accounts: [
        `${PRIVATE_KEY1}`,
        `${PRIVATE_KEY2}`,
        `${PRIVATE_KEY3}`,
        `${PRIVATE_KEY4}`,
        `${PRIVATE_KEY5}`,
        `${PRIVATE_KEY6}`,
        `${PRIVATE_KEY7}`,
      ],
    },
  },
};

export default config;
