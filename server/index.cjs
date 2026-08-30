const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { createRegistry } = require("./loans.cjs");
const chain = require("./chain.cjs");

const PORT = Number(process.env.PORT || 3001);
const MODE = process.env.BLOCKCHAIN_MODE || "simulation";

const DEMO = {
  borrower: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  admin: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
};

const registry = createRegistry();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: MODE,
    chainReady: MODE === "live" ? chain.isConfigured() : false,
  });
});

app.get("/api/demo", (_req, res) => {
  res.json(DEMO);
});

app.get("/api/loans", (_req, res) => {
  res.json({ loans: registry.list(), payments: registry.paymentLog() });
});

app.post("/api/loans", async (req, res) => {
  try {
    const {
      borrower = DEMO.borrower,
      amountCents = 100000,
      interestRateBps = 1299,
      termMonths = 12,
      monthlyPaymentCents = 8900,
    } = req.body || {};

    if (!amountCents || !termMonths) {
      return res.status(400).json({ error: "InvalidAmount" });
    }

    const loan = registry.create({
      borrower,
      amountCents,
      interestRateBps,
      termMonths,
      monthlyPaymentCents,
    });

    let txHash = null;
    if (MODE === "live" && chain.isConfigured()) {
      txHash = await chain.createOnChainLoan({
        offChainId: `off-${loan.id}`,
        borrower,
        amountCents: loan.amountCents,
        interestRateBps: loan.interestRateBps,
        termMonths: loan.termMonths,
        monthlyPaymentCents: loan.monthlyPaymentCents,
      });
    }

    res.status(201).json({ loan, txHash, mode: MODE });
  } catch (err) {
    res.status(400).json({ error: err.code || err.message });
  }
});

app.post("/api/loans/:id/:action", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const action = req.params.action;
    const role = req.body?.role || "admin";

    if (role !== "admin" && action !== "pay") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    let loan;
    let txHash = null;
    const live = MODE === "live" && chain.isConfigured();

    switch (action) {
      case "approve":
        loan = registry.approve(id);
        if (live) txHash = await chain.callPlatform("approveLoan", id);
        break;
      case "disburse":
        loan = registry.disburse(id);
        if (live) txHash = await chain.callPlatform("disburseLoan", id);
        break;
      case "reject":
        loan = registry.reject(id);
        if (live) txHash = await chain.callPlatform("rejectLoan", id);
        break;
      case "default":
        loan = registry.markDefaulted(id);
        if (live) txHash = await chain.callPlatform("markDefaulted", id);
        break;
      case "pay": {
        const amountCents = Number(req.body?.amountCents || 0);
        const isPlatform = role === "admin";
        const payer = isPlatform ? DEMO.admin : DEMO.borrower;
        const result = registry.recordPayment({ loanId: id, payer, amountCents, isPlatform });
        loan = result.loan;
        if (live) {
          txHash = await chain.recordPaymentOnChain(id, amountCents);
        }
        return res.json({ loan, payment: result.payment, txHash, mode: MODE });
      }
      default:
        return res.status(404).json({ error: "Unknown action" });
    }

    res.json({ loan, txHash, mode: MODE });
  } catch (err) {
    res.status(400).json({ error: err.code || err.message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT}  (mode=${MODE})`);
});
