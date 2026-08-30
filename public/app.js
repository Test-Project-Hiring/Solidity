const statusLabel = {
  0: "Pending",
  1: "Approved",
  2: "Disbursed",
  3: "Repaid",
  4: "Defaulted",
  5: "Rejected",
};

const statusTone = {
  0: "bg-amber-100 text-amber-800",
  1: "bg-sky-100 text-sky-800",
  2: "bg-leaf-100 text-leaf-700",
  3: "bg-emerald-100 text-emerald-800",
  4: "bg-rose-100 text-rose-800",
  5: "bg-slate-200 text-slate-700",
};

const btnPrimary =
  "rounded-lg bg-leaf-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-leaf-700";
const btnGhost =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-mist";
const btnDanger =
  "rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-800";
const inputClass =
  "w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-leaf-600 focus:ring-2 focus:ring-leaf-100";

const roleEl = document.getElementById("role");
const loanListEl = document.getElementById("loanList");
const createForm = document.getElementById("createForm");
const borrowerPanel = document.getElementById("borrowerPanel");
const modeBadge = document.getElementById("modeBadge");
const toastEl = document.getElementById("toast");
const refreshBtn = document.getElementById("refreshBtn");

function role() {
  return roleEl.value;
}

function showToast(message, isError = false) {
  toastEl.hidden = false;
  toastEl.textContent = message;
  toastEl.className = `pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
    isError ? "bg-rose-700" : "bg-ink"
  }`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.hidden = true;
  }, 3200);
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function money(cents) {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function syncRoleUi() {
  borrowerPanel.classList.toggle("hidden", role() === "admin");
  renderLoans(window.__loans || []);
}

function actionButtons(loan) {
  const r = role();
  const bits = [];

  if (r === "admin") {
    if (loan.status === 0) {
      bits.push(
        `<button class="${btnPrimary}" data-action="approve" data-id="${loan.id}">Approve</button>`
      );
      bits.push(
        `<button class="${btnGhost}" data-action="reject" data-id="${loan.id}">Reject</button>`
      );
    }
    if (loan.status === 1) {
      bits.push(
        `<button class="${btnPrimary}" data-action="disburse" data-id="${loan.id}">Disburse</button>`
      );
    }
    if (loan.status === 2) {
      bits.push(
        `<input class="${inputClass}" data-pay-input="${loan.id}" type="number" min="1" placeholder="Pay cents" />`
      );
      bits.push(
        `<button class="${btnPrimary}" data-action="pay" data-id="${loan.id}">Record payment</button>`
      );
      bits.push(
        `<button class="${btnDanger}" data-action="default" data-id="${loan.id}">Default</button>`
      );
    }
  }

  if (r === "borrower" && loan.status === 2) {
    bits.push(
      `<input class="${inputClass}" data-pay-input="${loan.id}" type="number" min="1" placeholder="Pay cents" />`
    );
    bits.push(
      `<button class="${btnPrimary}" data-action="pay" data-id="${loan.id}">Record payment</button>`
    );
  }

  return bits.join("");
}

function renderLoans(loans) {
  window.__loans = loans;
  if (!loans.length) {
    loanListEl.innerHTML = `<p class="rounded-xl border border-dashed border-slate-300 bg-mist/60 px-4 py-8 text-center text-slate-500">No loans yet.</p>`;
    return;
  }

  loanListEl.innerHTML = loans
    .slice()
    .reverse()
    .map((loan) => {
      const tone = statusTone[loan.status] || "bg-slate-200 text-slate-700";
      const label = statusLabel[loan.status] || loan.statusName;
      return `
      <article class="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-mist/40 p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <strong class="text-base text-ink">#${loan.id}</strong>
              <span class="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${tone}">${label}</span>
            </div>
            <p class="mt-1 text-sm text-slate-500">
              ${money(loan.amountCents)} · ${loan.termMonths} mo · ${loan.interestRateBps} bps
            </p>
          </div>
          <p class="text-sm font-medium text-slate-700">Remaining ${money(loan.remainingCents)}</p>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">${actionButtons(loan)}</div>
      </article>`;
    })
    .join("");
}

async function loadLoans() {
  const data = await api("/api/loans");
  renderLoans(data.loans);
}

async function loadHealth() {
  const data = await api("/api/health");
  modeBadge.textContent = data.mode;
}

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(createForm);
  try {
    const body = {
      amountCents: Number(fd.get("amountCents")),
      termMonths: Number(fd.get("termMonths")),
      interestRateBps: Number(fd.get("interestRateBps")),
      monthlyPaymentCents: Math.round(
        Number(fd.get("amountCents")) / Number(fd.get("termMonths"))
      ),
    };
    const data = await api("/api/loans", { method: "POST", body: JSON.stringify(body) });
    showToast(`Loan #${data.loan.id} created`);
    await loadLoans();
  } catch (err) {
    showToast(err.message, true);
  }
});

loanListEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const payload = { role: role() };

  if (action === "pay") {
    const input = loanListEl.querySelector(`[data-pay-input="${id}"]`);
    payload.amountCents = Number(input?.value || 0);
  }

  try {
    const data = await api(`/api/loans/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showToast(
      action === "pay"
        ? `Payment recorded · remaining ${money(data.loan.remainingCents)}`
        : `Loan #${id} → ${statusLabel[data.loan.status]}`
    );
    await loadLoans();
  } catch (err) {
    showToast(err.message, true);
  }
});

roleEl.addEventListener("change", syncRoleUi);
refreshBtn.addEventListener("click", () => loadLoans().catch((e) => showToast(e.message, true)));

Promise.all([loadHealth(), loadLoans()])
  .then(syncRoleUi)
  .catch((e) => showToast(e.message, true));
