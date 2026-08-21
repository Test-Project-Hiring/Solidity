/** Optional live-chain helpers (Hardhat / local node). */

const { ethers } = require("ethers");

const ABI = [
  "function createLoan(bytes32 offChainId, address borrower, uint256 amountCents, uint256 interestRateBps, uint256 termMonths, uint256 monthlyPaymentCents) returns (uint256)",
  "function approveLoan(uint256 loanId)",
  "function rejectLoan(uint256 loanId)",
  "function disburseLoan(uint256 loanId)",
  "function markDefaulted(uint256 loanId)",
  "function recordPayment(uint256 loanId, uint256 amountCents)",
  "function remainingOf(uint256 loanId) view returns (uint256)",
  "function getLoan(uint256 loanId) view returns (tuple(bytes32 offChainId, address borrower, uint256 amountCents, uint256 interestRateBps, uint256 termMonths, uint256 monthlyPaymentCents, uint8 status, uint64 createdAt, uint64 approvedAt, uint64 disbursedAt))",
  "function nextLoanId() view returns (uint256)",
  "function paymentCount() view returns (uint256)",
];

function isConfigured() {
  return Boolean(process.env.LOAN_CONTRACT_ADDRESS && process.env.RPC_URL && process.env.PLATFORM_PRIVATE_KEY);
}

function getContract(signerOrProvider) {
  return new ethers.Contract(process.env.LOAN_CONTRACT_ADDRESS, ABI, signerOrProvider);
}

function getPlatformWallet() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
  return new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, provider);
}

async function createOnChainLoan(input) {
  const wallet = getPlatformWallet();
  const contract = getContract(wallet);
  const offChainId = ethers.id(input.offChainId || `loan-${Date.now()}`);
  const tx = await contract.createLoan(
    offChainId,
    input.borrower,
    input.amountCents,
    input.interestRateBps,
    input.termMonths,
    input.monthlyPaymentCents
  );
  await tx.wait();
  return tx.hash;
}

async function callPlatform(fn, loanId) {
  const wallet = getPlatformWallet();
  const contract = getContract(wallet);
  const tx = await contract[fn](loanId);
  await tx.wait();
  return tx.hash;
}

async function recordPaymentOnChain(loanId, amountCents, privateKey) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(privateKey || process.env.PLATFORM_PRIVATE_KEY, provider);
  const contract = getContract(wallet);
  const tx = await contract.recordPayment(loanId, amountCents);
  await tx.wait();
  return tx.hash;
}

module.exports = {
  isConfigured,
  createOnChainLoan,
  callPlatform,
  recordPaymentOnChain,
};
