import { useState, useMemo } from 'react';
import { useFinancial } from '@/store/FinancialContext';

const defaults = {
  A: 3325.59,
  n: 10,
  r: 6,
  i: 3,
};

export default function ReverseCalculator() {
  const {
    investAPR,
    setInvestAPR,
    termYears,
    setTermYears,
    currency,
    setPrincipal,
  } = useFinancial();
  const [A, setA] = useState<number>(defaults.A);
  const [i, setI] = useState<number>(defaults.i);
  const [period, setPeriod] = useState<'year' | 'month'>('year');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [yearsNote, setYearsNote] = useState<string>('');
  const n = termYears;
  const r = investAPR;

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

  const validateRates = (field: string, val: number) => {
    if (val <= -100) {
      const msg = field === 'i' && val === -100 ? 'Inflation cannot be −100%' : 'Must be > -100%';
      setErrors((e) => ({ ...e, [field]: msg }));
      return false;
    }
    if (val > 1000) {
      setErrors((e) => ({ ...e, [field]: 'Warning: rate > 1000%' }));
      return true;
    }
    setErrors((e) => {
      const clone = { ...e };
      delete clone[field];
      return clone;
    });
    return true;
  };

  const handleA = (v: number) => {
    setA(v);
    if (v < 0) {
      setErrors((e) => ({ ...e, A: 'Must be ≥ 0' }));
    } else {
      setErrors((e) => {
        const clone = { ...e };
        delete clone.A;
        return clone;
      });
    }
  };
  const handleN = (v: number) => {
    let clamped = Math.round(v);
    let note = '';
    if (clamped < 1) {
      clamped = 1;
      note = 'Clamped to minimum 1';
    } else if (clamped > 30) {
      clamped = 30;
      note = 'Clamped to maximum 30';
    }
    setTermYears(clamped);
    setYearsNote(note);
  };
  const handleR = (v: number) => {
    setInvestAPR(v);
    validateRates('r', v);
  };
  const handleI = (v: number) => {
    setI(v);
    validateRates('i', v);
  };

  const rDec = r / 100;
  const iDec = i / 100;
  const AYear = period === 'month' ? A * 12 : A;
  const g = Math.pow(1 + rDec, n) / Math.pow(1 + iDec, n);
  const den = g - 1;
  let principal = 0;
  let resultError = '';
  if (den > 0 && A >= 0 && !errors.A && !errors.r && !errors.i) {
    principal = (n * AYear) / den;
  } else if (den <= 0) {
    resultError =
      'Invalid parameters: effective growth is not above inflation over n years. Increase interest, reduce inflation, or increase years.';
  }
  if (!resultError) {
    setPrincipal(principal);
  }

  const format = (n: number) => (
    <span title={n.toExponential(2)}>{formatter.format(n)}</span>
  );

  const reset = () => {
    handleA(defaults.A);
    handleN(defaults.n);
    handleR(defaults.r);
    handleI(defaults.i);
    setPeriod('year');
  };

  const formula = `P = ${n}·${AYear.toPrecision(6)} / ((1+${rDec.toPrecision(4)})^${n}/(1+${iDec.toPrecision(4)})^${n} - 1)`;

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <div className="input-group">
        <label htmlFor="A">Target avg real</label>
        <input
          id="A"
          type="number"
          min="0"
          value={A}
          onChange={(e) => handleA(Number(e.target.value))}
          aria-describedby="A-error"
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'year' | 'month')}
          aria-label="period"
        >
          <option value="year">per year</option>
          <option value="month">per month</option>
        </select>
        {errors.A && (
          <div id="A-error" className="error">
            {errors.A}
          </div>
        )}
      </div>
      <div className="input-group">
        <label htmlFor="n">Years</label>
        <input
          id="n"
          type="number"
          min="1"
          max="30"
          value={n}
          onChange={(e) => handleN(Number(e.target.value))}
          aria-describedby="n-note"
        />
        {yearsNote && (
          <div id="n-note" className="error">
            {yearsNote}
          </div>
        )}
      </div>
      <div className="input-group">
        <label htmlFor="r">Interest rate %</label>
        <input
          id="r"
          type="number"
          value={r}
          onChange={(e) => handleR(Number(e.target.value))}
          aria-describedby="r-error"
        />
        {errors.r && (
          <div id="r-error" className="error">
            {errors.r}
          </div>
        )}
      </div>
      <div className="input-group">
        <label htmlFor="i">Inflation rate %</label>
        <input
          id="i"
          type="number"
          value={i}
          onChange={(e) => handleI(Number(e.target.value))}
          aria-describedby="i-error"
        />
        {errors.i && (
          <div id="i-error" className="error">
            {errors.i}
          </div>
        )}
      </div>
      <div className="input-group">
        <div className="stat">
          {resultError || errors.A || errors.r || errors.i ? '—' : format(principal)}
        </div>
        <div className="caption">Required principal (P)</div>
        {resultError && <div className="error">{resultError}</div>}
      </div>
      <div className="formula">{formula}</div>
      <div className="reference">P: principal, A: target avg real per {period}, n: years, r: interest, i: inflation</div>
      <div className="buttons">
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
