/** In-memory loan registry used when BLOCKCHAIN_MODE=simulation. */

const STATUS = {
  PENDING: 0,
  APPROVED: 1,
  DISBURSED: 2,
  REPAID: 3,
  DEFAULTED: 4,
  REJECTED: 5,
};

const STATUS_NAME = [
  "Pending",
  "Approved",
  "Disbursed",
  "Repaid",
  "Defaulted",
  "Rejected",
];

function createRegistry() {
  let nextLoanId = 1;
  const loans = new Map();
  const remaining = new Map();
  const payments = [];

  return {
    STATUS,
    STATUS_NAME,

    list() {
      return [...loans.values()].map((loan) => ({
        ...loan,
        statusName: STATUS_NAME[loan.status],
        remainingCents: remaining.get(loan.id) ?? 0,
      }));
    },

    get(id) {
      const loan = loans.get(Number(id));
      if (!loan) return null;
      return {
        ...loan,
        statusName: STATUS_NAME[loan.status],
        remainingCents: remaining.get(loan.id) ?? 0,
      };
    },

    create({ borrower, amountCents, interestRateBps, termMonths, monthlyPaymentCents }) {
      const id = nextLoanId++;
      const loan = {
        id,
        borrower,
        amountCents: Number(amountCents),
        interestRateBps: Number(interestRateBps),
        termMonths: Number(termMonths),
        monthlyPaymentCents: Number(monthlyPaymentCents),
        status: STATUS.PENDING,
        createdAt: Date.now(),
      };
      loans.set(id, loan);
      remaining.set(id, loan.amountCents);
      return this.get(id);
    },

    approve(id) {
      const loan = loans.get(Number(id));
      if (!loan) throw Object.assign(new Error("Loan not found"), { code: "LoanNotFound" });
      if (loan.status !== STATUS.PENDING) {
        throw Object.assign(new Error("Invalid status transition"), { code: "InvalidStatusTransition" });
      }
      loan.status = STATUS.APPROVED;
      return this.get(id);
    },

    disburse(id) {
      const loan = loans.get(Number(id));
      if (!loan) throw Object.assign(new Error("Loan not found"), { code: "LoanNotFound" });
      if (loan.status !== STATUS.APPROVED) {
        throw Object.assign(new Error("Invalid status transition"), { code: "InvalidStatusTransition" });
      }
      loan.status = STATUS.DISBURSED;
      return this.get(id);
    },

    reject(id) {
      const loan = loans.get(Number(id));
      if (!loan) throw Object.assign(new Error("Loan not found"), { code: "LoanNotFound" });
      if (loan.status !== STATUS.PENDING) {
        throw Object.assign(new Error("Invalid status transition"), { code: "InvalidStatusTransition" });
      }
      loan.status = STATUS.REJECTED;
      return this.get(id);
    },

    markDefaulted(id) {
      const loan = loans.get(Number(id));
      if (!loan) throw Object.assign(new Error("Loan not found"), { code: "LoanNotFound" });
      if (loan.status !== STATUS.DISBURSED) {
        throw Object.assign(new Error("Invalid status transition"), { code: "InvalidStatusTransition" });
      }
      loan.status = STATUS.DEFAULTED;
      return this.get(id);
    },

    /** Mirrors the Solidity recordPayment hiring task. */
    recordPayment({ loanId, payer, amountCents, isPlatform }) {
      const id = Number(loanId);
      const amount = Number(amountCents);
      const loan = loans.get(id);
      if (!loan) throw Object.assign(new Error("Loan not found"), { code: "LoanNotFound" });

      const authorized = isPlatform || payer === loan.borrower;
      if (!authorized) {
        throw Object.assign(new Error("Unauthorized"), { code: "Unauthorized" });
      }
      if (loan.status !== STATUS.DISBURSED) {
        throw Object.assign(new Error("Invalid status transition"), { code: "InvalidStatusTransition" });
      }

      const left = remaining.get(id) ?? 0;
      if (!(amount > 0) || amount > left) {
        throw Object.assign(new Error("Invalid amount"), { code: "InvalidAmount" });
      }

      const next = left - amount;
      remaining.set(id, next);
      if (next === 0) loan.status = STATUS.REPAID;

      const payment = { loanId: id, payer, amountCents: amount, remainingCents: next };
      payments.push(payment);
      return { loan: this.get(id), payment };
    },

    paymentLog() {
      return [...payments];
    },
  };
}

module.exports = { createRegistry, STATUS, STATUS_NAME };
