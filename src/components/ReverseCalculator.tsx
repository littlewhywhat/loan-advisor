import { useState, useMemo } from 'react';

type Currency = 'CZK' | 'USD' | 'EUR';

interface ReverseCalculatorProps {
  currency: Currency;
}

const defaults = {
  A: 3325.59,
  n: 10,
  r: 6,
  i: 3,
};

export default function ReverseCalculator({ currency }: ReverseCalculatorProps) {
  const [A, setA] = useState<number>(defaults.A);
  const [n, setN] = useState<number>(defaults.n);
  const [r, setR] = useState<number>(defaults.r);
  const [i, setI] = useState<number>(defaults.i);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [yearsNote, setYearsNote] = useState<string>('');

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
    setN(clamped);
    setYearsNote(note);
  };
  const handleR = (v: number) => {
    setR(v);
    validateRates('r', v);
  };
  const handleI = (v: number) => {
    setI(v);
    validateRates('i', v);
  };

  const rDec = r / 100;
  const iDec = i / 100;
  const g = Math.pow(1 + rDec, n) / Math.pow(1 + iDec, n);
  const den = g - 1;
  let principal = 0;
  let resultError = '';
  if (den > 0 && A >= 0 && !errors.A && !errors.r && !errors.i) {
    principal = (n * A) / den;
  } else if (den <= 0) {
    resultError =
      'Invalid parameters: effective growth is not above inflation over n years. Increase interest, reduce inflation, or increase years.';
  }

  const format = (n: number) => (
    <span title={n.toExponential(2)}>{formatter.format(n)}</span>
  );

  const reset = () => {
    handleA(defaults.A);
    handleN(defaults.n);
    handleR(defaults.r);
    handleI(defaults.i);
  };

  const formula = `P = ${n}·${A.toPrecision(6)} / ((1+${rDec.toPrecision(4)})^${n}/(1+${iDec.toPrecision(4)})^${n} - 1)`;

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <div className="input-group">
        <label htmlFor="A">Target avg real per year</label>
        <input
          id="A"
          type="number"
          min="0"
          value={A}
          onChange={(e) => handleA(Number(e.target.value))}
          aria-describedby="A-error"
        />
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
      <div className="reference">P: principal, A: target avg real per year, n: years, r: interest, i: inflation</div>
      <div className="buttons">
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
