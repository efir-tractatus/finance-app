export interface RankingRow {
  rank: number;
  symbol: string;
  name: string;
  color: string;
  changePct: number;
}

interface RankingTableProps {
  rows: RankingRow[];
  /** Symbol to emphasize (the dashboard's focus company) */
  highlight?: string;
  caption: string;
}

export function RankingTable({ rows, highlight, caption }: RankingTableProps) {
  return (
    <table className="ranking">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Company</th>
          <th scope="col">Change</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.symbol} className={r.symbol === highlight ? 'ranking__row--focus' : undefined}>
            <td>{r.rank}</td>
            <td>
              <span className="swatch" style={{ background: r.color }} aria-hidden="true" />
              {r.name} <small>{r.symbol}</small>
            </td>
            <td className={r.changePct >= 0 ? 'summary__change--up' : 'summary__change--down'}>
              {r.changePct >= 0 ? '+' : ''}
              {r.changePct.toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
