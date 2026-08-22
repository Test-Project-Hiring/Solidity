const hre = require("hardhat");

async function main() {
  const [deployer, platform] = await hre.ethers.getSigners();
  const platformAddress = process.env.PLATFORM_ADDRESS || platform.address;

  const VeriFiLoan = await hre.ethers.getContractFactory("VeriFiLoan");
  const loan = await VeriFiLoan.deploy(platformAddress);
  await loan.waitForDeployment();

  const TrustAttestation = await hre.ethers.getContractFactory("TrustAttestation");
  const attestation = await TrustAttestation.deploy(platformAddress);
  await attestation.waitForDeployment();

  const loanAddress = await loan.getAddress();
  const attestationAddress = await attestation.getAddress();

  console.log("Deployer:", deployer.address);
  console.log("Platform:", platformAddress);
  console.log("VeriFiLoan:", loanAddress);
  console.log("TrustAttestation:", attestationAddress);
  console.log("\nAdd to .env for live mode:");
  console.log(`BLOCKCHAIN_MODE=live`);
  console.log(`RPC_URL=http://127.0.0.1:8545`);
  console.log(`LOAN_CONTRACT_ADDRESS=${loanAddress}`);
  console.log(`PLATFORM_PRIVATE_KEY=<hardhat account private key>`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
