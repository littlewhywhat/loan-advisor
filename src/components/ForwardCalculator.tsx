import { useState, useMemo } from 'react';

type Currency = 'CZK' | 'USD' | 'EUR';

interface ForwardCalculatorProps {
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
}

const defaultVals = {
  principal: 100000,
  rate: 6,
  inflation: 3,
  years: 10,
};

export default function ForwardCalculator({ currency, onCurrencyChange }: ForwardCalculatorProps) {
  const [principal, setPrincipal] = useState<number>(defaultVals.principal);
  const [rate, setRate] = useState<number>(defaultVals.rate);
  const [inflation, setInflation] = useState<number>(defaultVals.inflation);
  const [years, setYears] = useState<number>(defaultVals.years);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validate = (field: string, value: number) => {
    if (value < 0) {
      setErrors((e) => ({ ...e, [field]: 'Must be ≥ 0' }));
      return false;
    }
    setErrors((e) => {
      const clone = { ...e };
      delete clone[field];
      return clone;
    });
    return true;
  };

  const handlePrincipal = (v: number) => {
    setPrincipal(v);
    validate('principal', v);
  };
  const handleRate = (v: number) => {
    setRate(v);
    validate('rate', v);
  };
  const handleInflation = (v: number) => {
    setInflation(v);
    validate('inflation', v);
  };
  const handleYears = (v: number) => {
    const clamped = Math.max(1, Math.min(30, Math.round(v)));
    setYears(clamped);
    validate('years', clamped);
  };

  const rateDec = rate / 100;
  const inflationDec = inflation / 100;
  const valid =
    Object.keys(errors).length === 0 &&
    principal >= 0 &&
    rate >= 0 &&
    inflation >= 0 &&
    years >= 1;

  const nominal = valid ? principal * Math.pow(1 + rateDec, years) : 0;
  const real = valid ? nominal / Math.pow(1 + inflationDec, years) : 0;
  const avgReal = valid ? (real - principal) / years : 0;
  const avgRealMonth = valid ? (real - principal) / (years * 12) : 0;

  const format = (n: number) => (
    <span title={n.toExponential(2)}>{formatter.format(n)}</span>
  );

  const copyResults = () => {
    const text = `Principal: ${formatter.format(principal)}\nInterest: ${rate}%\nInflation: ${inflation}%\nYears: ${years}\nNominal: ${formatter.format(nominal)}\nReal: ${formatter.format(real)}\nAverage real per year: ${formatter.format(avgReal)}\nAverage real per month: ${formatter.format(avgRealMonth)}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const reset = () => {
    handlePrincipal(defaultVals.principal);
    handleRate(defaultVals.rate);
    handleInflation(defaultVals.inflation);
    handleYears(defaultVals.years);
    onCurrencyChange('CZK');
  };

  return (
    <div className="calc-container">
      <div className="card" style={{ flex: 1 }}>
        <div className="input-group">
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value as Currency)}
          >
            <option value="CZK">Kč</option>
            <option value="EUR">€</option>
            <option value="USD">$</option>
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="principal">Initial principal</label>
          <input
            id="principal"
            type="number"
            step="1000"
            min="0"
            value={principal}
            onChange={(e) => handlePrincipal(Number(e.target.value))}
            aria-describedby="principal-error"
          />
          {errors.principal && (
            <div id="principal-error" className="error">
              {errors.principal}
            </div>
          )}
        </div>
        <div className="input-group">
          <label htmlFor="rate">Interest (per year) %</label>
          <input
            id="rate"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={rate}
            onChange={(e) => handleRate(Number(e.target.value))}
            aria-describedby="rate-error"
          />
          {errors.rate && (
            <div id="rate-error" className="error">
              {errors.rate}
            </div>
          )}
        </div>
        <div className="input-group">
          <label htmlFor="inflation">Inflation (per year) %</label>
          <input
            id="inflation"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={inflation}
            onChange={(e) => handleInflation(Number(e.target.value))}
            aria-describedby="inflation-error"
          />
          {errors.inflation && (
            <div id="inflation-error" className="error">
              {errors.inflation}
            </div>
          )}
        </div>
        <div className="input-group">
          <label htmlFor="years">Years</label>
          <input
            id="years"
            type="number"
            min="1"
            max="30"
            step="1"
            value={years}
            onChange={(e) => handleYears(Number(e.target.value))}
            aria-describedby="years-error"
          />
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={years}
            onChange={(e) => handleYears(Number(e.target.value))}
          />
          <span className="badge">{years}</span>
          {errors.years && (
            <div id="years-error" className="error">
              {errors.years}
            </div>
          )}
        </div>
        <div className="buttons">
          <button type="button" onClick={copyResults}>
            Copy results
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>
      <div className="card results" style={{ flex: 1 }}>
        <div className="input-group">
          <div className="stat">{format(nominal)}</div>
          <div className="caption">Nominal: P(1+r)^t</div>
        </div>
        <div className="input-group">
          <div className="stat">{format(real)}</div>
          <div className="caption">
            Real: P(1+r)^t/(1+i)^t
            {inflation === 0 && (
              <div className="caption">Real equals Nominal (inflation = 0%)</div>
            )}
          </div>
        </div>
        <div className="input-group">
          <div className="stat">{format(avgReal)}</div>
          <div className="caption">Avg per year (real): (A_real - P)/t</div>
        </div>
        <div className="input-group">
          <div className="stat">{format(avgRealMonth)}</div>
          <div className="caption">Avg per month (real): (A_real - P)/(t·12)</div>
        </div>
        <details>
          <summary>Details</summary>
          <p className="formula">nominal = principal * (1 + r)^t</p>
          <p className="formula">real = nominal / (1 + i)^t</p>
          <p className="formula">avgYear = (real - principal) / t</p>
          <p className="formula">avgMonth = (real - principal) / (t * 12)</p>
        </details>
      </div>
    </div>
  );
}
