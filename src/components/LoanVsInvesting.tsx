import { useState, useMemo, useEffect } from 'react';
import { useFinancial, type Currency } from '@/store/FinancialContext';
import styles from './LoanVsInvesting.module.css';
import { Slider, Tooltip } from '@radix-ui/themes';
import { payment, savingsBenchmark, lumpWithWithdrawals } from '@/lib/finance';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Legend,
  Tooltip as RechartTooltip,
  CartesianGrid,
} from '@/stubs/recharts';

interface ScheduleRow {
  year: number;
  savingInterest: number;
  cumSavingInterest: number;
  lumpRaw: number;
  allowed: number;
  retained: number;
  cumRetained: number;
  loanInterest: number;
  principalPaid: number;
  balance: number;
}

function compute(
  principal: number,
  loanAPR: number,
  termYears: number,
  investAPR: number,
  horizon: number,
) {
  const rLAnnual = loanAPR / 100;
  const rSAnnual = investAPR / 100;
  const monthlyPayment = payment(principal, rLAnnual, termYears);
  const { savingInterestYear } = savingsBenchmark(monthlyPayment, rSAnnual, horizon);
  const lump = lumpWithWithdrawals(principal, rSAnnual, horizon, savingInterestYear);
  const schedule: ScheduleRow[] = [];
  let loanBalance = principal;
  const rLMonthly = rLAnnual / 12;
  let cumSavingInterest = 0;
  for (let year = 1; year <= horizon; year++) {
    let loanInterestYear = 0;
    let principalPaidYear = 0;
    for (let m = 0; m < 12; m++) {
      const interest = loanBalance * rLMonthly;
      const principalPaid = monthlyPayment - interest;
      loanBalance -= principalPaid;
      loanInterestYear += interest;
      principalPaidYear += principalPaid;
    }
    const savingInt = savingInterestYear[year - 1];
    cumSavingInterest += savingInt;
    schedule.push({
      year,
      savingInterest: savingInt,
      cumSavingInterest,
      lumpRaw: lump.lumpRawInterestYear[year - 1],
      allowed: lump.allowedWithdrawalYear[year - 1],
      retained: lump.retainedYear[year - 1],
      cumRetained: lump.cumRetained[year - 1],
      loanInterest: loanInterestYear,
      principalPaid: principalPaidYear,
      balance: loanBalance < 0 ? 0 : loanBalance,
    });
  }
  const totalAllowed = lump.allowedWithdrawalYear.reduce((a, b) => a + b, 0);
  return {
    monthlyPayment,
    totalAllowed,
    avgMonthlyWithdrawal: totalAllowed / (horizon * 12),
    cumRetained: lump.cumRetained[lump.cumRetained.length - 1] ?? 0,
    endBalance: loanBalance < 0 ? 0 : loanBalance,
    schedule,
  };
}

export default function LoanVsInvesting() {
  const {
    principal,
    setPrincipal,
    loanAPR,
    setLoanAPR,
    termYears,
    setTermYears,
    investAPR,
    setInvestAPR,
    currency,
    setCurrency,
  } = useFinancial();
  const [horizon, setHorizon] = useState(termYears);
  useEffect(() => {
    if (horizon > termYears) setHorizon(termYears);
  }, [termYears, horizon]);

  const calc = useMemo(
    () =>
      compute(principal, loanAPR, termYears, investAPR, Math.min(horizon, termYears)),
    [principal, loanAPR, termYears, investAPR, horizon],
  );

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [currency],
  );

  const handlePrincipal = (v: number) => setPrincipal(v);
  const handleLoanAPR = (v: number) => setLoanAPR(v);
  const handleInvestAPR = (v: number) => setInvestAPR(v);
  const handleTerm = (v: number) => setTermYears(Math.max(1, Math.min(30, Math.round(v))));
  const handleHorizon = (v: number) => setHorizon(Math.max(1, Math.min(termYears, Math.round(v))));

  const format = (n: number) => formatter.format(n);

  return (
    <div className={styles.container}>
      <section className={styles.inputs}>
        <label>
          Loan principal
          <input type="number" value={principal} onChange={(e) => handlePrincipal(Number(e.target.value))} />
        </label>
        <label>
          Loan APR (%)
          <Tooltip content="monthly rₗ = APR/12">
            <button type="button" aria-label="loan apr info" style={{ marginLeft: '0.25rem' }}>
              ?
            </button>
          </Tooltip>
          <input type="number" value={loanAPR} onChange={(e) => handleLoanAPR(Number(e.target.value))} />
          <Slider value={[loanAPR]} max={100} step={0.1} onValueChange={(v: number[]) => handleLoanAPR(v[0])} />
        </label>
        <label>
          Term (years)
          <input type="number" value={termYears} onChange={(e) => handleTerm(Number(e.target.value))} />
        </label>
        <label>
          Investment APR (%)
          <Tooltip content="growth rₛ = APR/yr">
            <button type="button" aria-label="invest apr info" style={{ marginLeft: '0.25rem' }}>
              ?
            </button>
          </Tooltip>
          <input type="number" value={investAPR} onChange={(e) => handleInvestAPR(Number(e.target.value))} />
          <Slider value={[investAPR]} max={100} step={0.1} onValueChange={(v: number[]) => handleInvestAPR(v[0])} />
        </label>
        <label>
          Horizon (years)
          <input type="number" value={horizon} onChange={(e) => handleHorizon(Number(e.target.value))} />
          <Slider value={[horizon]} max={termYears} min={1} step={1} onValueChange={(v: number[]) => handleHorizon(v[0])} />
        </label>
        <label>
          Currency
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="CZK">Kč</option>
            <option value="EUR">€</option>
            <option value="USD">$</option>
          </select>
        </label>
      </section>
      <section className={styles.outputs}>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <div>{format(calc.monthlyPayment)}</div>
            <div>Monthly payment</div>
          </div>
          <div className={styles.metric}>
            <div>{format(calc.totalAllowed)}</div>
            <div>Total allowed withdrawals</div>
          </div>
          <div className={styles.metric}>
            <div>{format(calc.avgMonthlyWithdrawal)}</div>
            <div>Avg monthly withdrawal</div>
          </div>
          <div className={styles.metric}>
            <div>{format(calc.cumRetained)}</div>
            <div>Cumulative retained</div>
          </div>
          <div className={styles.metric}>
            <div>{format(calc.endBalance)}</div>
            <div>Loan balance at horizon</div>
          </div>
        </div>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={calc.schedule}>
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="year" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <RechartTooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="allowed" stackId="a" fill="#8884d8" name="Allowed" />
              <Bar yAxisId="left" dataKey="retained" stackId="a" fill="#82ca9d" name="Retained" />
              <Line yAxisId="right" type="monotone" dataKey="cumRetained" stroke="#ff7300" name="Cum Retained" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Year</th>
              <th>Saving interest</th>
              <th>Cum saving interest</th>
              <th>Lump raw interest</th>
              <th>Allowed withdrawal</th>
              <th>Retained</th>
              <th>Cum retained</th>
              <th>Loan interest</th>
              <th>Principal paid</th>
              <th>Loan balance</th>
            </tr>
          </thead>
          <tbody>
            {calc.schedule.map((row) => (
              <tr key={row.year}>
                <td>{row.year}</td>
                <td>{format(row.savingInterest)}</td>
                <td>{format(row.cumSavingInterest)}</td>
                <td>{format(row.lumpRaw)}</td>
                <td>{format(row.allowed)}</td>
                <td>{format(row.retained)}</td>
                <td>{format(row.cumRetained)}</td>
                <td>{format(row.loanInterest)}</td>
                <td>{format(row.principalPaid)}</td>
                <td>{format(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
