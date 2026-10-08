import { average, pctChange, rankByChange, rebaseTo100 } from '../../domain/metrics';
import type { Company, PriceSeries } from '../../domain/types';
import type { ChartSeries } from '../../components/PriceLineChart';
import type { RankingRow } from '../../components/RankingTable';

export interface Comparison {
  chartSeries: ChartSeries[];
  ranking: RankingRow[];
  /** Focus company's row, if its history loaded */
  focus?: RankingRow;
  /** Average change of every company except the focus company; undefined with no peers */
  peerAverage?: number;
}

/** Turns raw histories into rebased chart series and a best-first ranking by period change. */
export function buildComparison(series: PriceSeries[], companies: Company[], focusSymbol: string): Comparison {
  const byCompany = (symbol: string) => companies.find((c) => c.symbol === symbol);

  const chartSeries: ChartSeries[] = series.map((s) => ({
    key: s.symbol,
    label: byCompany(s.symbol)?.name ?? s.symbol,
    color: byCompany(s.symbol)?.color ?? '#888',
    points: rebaseTo100(s.points),
  }));

  const ranking = rankByChange(
    series.map((s) => ({
      symbol: s.symbol,
      name: byCompany(s.symbol)?.name ?? s.symbol,
      color: byCompany(s.symbol)?.color ?? '#888',
      changePct: pctChange(s.points),
    })),
  );

  const peers = ranking.filter((r) => r.symbol !== focusSymbol);
  return {
    chartSeries,
    ranking,
    focus: ranking.find((r) => r.symbol === focusSymbol),
    peerAverage: peers.length > 0 ? average(peers.map((p) => p.changePct)) : undefined,
  };
}

export const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
export const toneOf = (n: number): 'up' | 'down' => (n >= 0 ? 'up' : 'down');
