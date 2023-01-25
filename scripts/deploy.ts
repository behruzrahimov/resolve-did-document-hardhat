import { keccak256 } from "@ethersproject/keccak256";
import { ethers } from "hardhat";
const version = "1.0";

async function main() {
  const accounts = await ethers.getSigners();
  const AnchorContract = await ethers.getContractFactory("AnchorContract");
  const Forwarder = ethers.getContractFactory("MinimalForwarder");

  const [relayer, admin1, admin2, member1, member2, nonMember] = accounts;

  const forwarder = (await Forwarder).deploy();
  const forwarderAddress = (await forwarder).address;

  const anchor = await AnchorContract.deploy(
    [admin1.address, admin2.address],
    [member1.address, member2.address],
    forwarderAddress,
    version
  );
}
main();
