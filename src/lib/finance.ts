export function computeSavingsBenchmark(
  M: number,          // monthly contribution (same M as loan payment)
  rsAnnual: number,   // investment APR as decimal, e.g. 0.08
  years: number       // horizon in years (H)
) {
  const j = rsAnnual / 12;           // monthly rate
  const months = years * 12;

  const savingInterestYear: number[] = [];
  const cumSavingInterest: number[] = [];

  let bal = 0;                       // savings balance
  let yInt = 0;                      // interest earned within current year
  let cum = 0;

  for (let m = 1; m <= months; m++) {
    const interest = bal * j;        // accrue on current balance
    yInt += interest;
    bal += interest;                 // add earned interest
    bal += M;                        // then deposit monthly contribution

    if (m % 12 === 0) {
      savingInterestYear.push(yInt);
      cum += yInt;
      cumSavingInterest.push(cum);
      yInt = 0;
    }
  }

  return { savingInterestYear, cumSavingInterest };
}
