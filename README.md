# Solidity hiring screen

This repo is a **~10–15 minute Solidity hiring screen**. The task is the on-chain loan registry in `contracts/VeriFiLoan.sol`.

A simple Node backend + static frontend are included so you can demo the loan flow.

## Your task

The loan registry can create, approve, and disburse a loan, but it cannot record **partial repayments**. Implement `recordPayment` in `contracts/VeriFiLoan.sol`.

Do not edit the tests.

```bash
npm install
npx hardhat test
```

You should see failing tests under `recordPayment`. Make them pass.

### Implement

**`recordPayment(uint256 loanId, uint256 amountCents)`**

- Platform **or** the borrower may call it (`msg.sender`)
- Loan must be `STATUS_DISBURSED`
- `amountCents` must be `> 0` and `<=` remaining
- Decrease remaining
- If remaining hits 0, set status to `STATUS_REPAID`
- Append a `Payment` to `payments` (`loanId`, `payer`, `amountCents`, `remainingCents`)
- On failure, revert with one of the custom errors already defined in the contract and do not append a payment

`remainingOf` and `markDefaulted` are already finished. Use them and the other helpers in the file as reference.

Do not change function signatures, the `Loan` struct, the `Payment` struct, or the custom errors.

## Submit

```bash
git checkout -b <your-name>/loan
git add contracts/VeriFiLoan.sol
git commit -m "Record partial loan repayments"
```

## Demo app (frontend + backend)

Simulation mode (default) — no chain required:

```bash
cp .env.example .env
npm install
npm run dev
```

`npm run dev` builds Tailwind CSS (`public/styles.css`) then starts the server.

Open http://localhost:3001

While editing UI classes, run `npm run watch:css` in another terminal.

- **Borrower**: create a loan, record payments after disbursal
- **Admin**: approve → disburse → record payment / default

### Optional live chain

```bash
npx hardhat node
# other terminal:
npx hardhat run scripts/deploy.cjs --network localhost
```

Put the printed `VeriFiLoan` address and a Hardhat private key into `.env`, set `BLOCKCHAIN_MODE=live`, then restart `npm run dev`.
