interface SummaryCardProps {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  currency: string;
}

export function SummaryCard({ name, symbol, price, change, changePct, currency }: SummaryCardProps) {
  const direction = change >= 0 ? 'up' : 'down';
  const sign = change >= 0 ? '+' : '';
  return (
    <article className="card summary" aria-label={`${name} summary`}>
      <h3 className="card__title">
        {name} <small>{symbol}</small>
      </h3>
      <p className="summary__price">
        {price.toFixed(2)} {currency}
      </p>
      <p className={`summary__change summary__change--${direction}`}>
        {sign}
        {change.toFixed(2)} ({sign}
        {changePct.toFixed(2)}%)
      </p>
    </article>
  );
}
