export function payment(P: number, rLoanAnnual: number, years: number) {
  const i = rLoanAnnual / 12;
  const N = years * 12;
  return P * (i / (1 - Math.pow(1 + i, -N)));
}

export function savingsBenchmark(M: number, rSAnnual: number, years: number) {
  const j = rSAnnual / 12;
  const months = years * 12;

  const savingInterestYear: number[] = [];
  const cumSavingInterest: number[] = [];

  let bal = 0;
  let yInt = 0;
  let cum = 0;

  for (let m = 1; m <= months; m++) {
    const interest = bal * j; // accrue
    yInt += interest;
    bal += interest; // compound
    bal += M; // deposit
    if (m % 12 === 0) {
      savingInterestYear.push(yInt);
      cum += yInt;
      cumSavingInterest.push(cum);
      yInt = 0;
    }
  }
  return { savingInterestYear, cumSavingInterest };
}

export function lumpWithWithdrawals(
  P: number,
  rSAnnual: number,
  years: number,
  savingInterestYear: number[],
) {
  const j = rSAnnual / 12;
  const months = years * 12;

  const lumpRawInterestYear: number[] = [];
  const allowedWithdrawalYear: number[] = [];
  const retainedYear: number[] = [];
  const cumRetained: number[] = [];

  let lumpBal = P;
  let yInt = 0;
  let cum = 0;
  let deficit = 0;

  for (let m = 1; m <= months; m++) {
    const interest = lumpBal * j;
    yInt += interest;
    lumpBal += interest;

    if (m % 12 === 0) {
      const yearIdx = m / 12 - 1;
      const raw = yInt;
      const targetRetain = savingInterestYear[yearIdx] + deficit;

      let allowed = raw - targetRetain;
      if (allowed < 0) {
        deficit = -allowed;
        allowed = 0;
      } else {
        deficit = 0;
      }

      const retained = raw - allowed;
      lumpBal -= allowed;

      lumpRawInterestYear.push(raw);
      allowedWithdrawalYear.push(allowed);
      retainedYear.push(retained);

      cum += retained;
      cumRetained.push(cum);

      yInt = 0;
    }
  }
  return { lumpRawInterestYear, allowedWithdrawalYear, retainedYear, cumRetained };
}
