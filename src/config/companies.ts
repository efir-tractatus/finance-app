import type { Company } from '../domain/types';

/** IBM plus up to four competitors. Add a company by adding one entry here. */
export const MAX_COMPETITORS = 4;

/** The company the dashboard is centred on; the others are its comparison set. */
export const PRIMARY_SYMBOL = 'IBM';

export const DEFAULT_COMPANIES: Company[] = [
  { symbol: 'IBM', name: 'IBM', color: '#0f62fe', mockBasePrice: 230 },
  { symbol: 'MSFT', name: 'Microsoft', color: '#24a148', mockBasePrice: 420 },
  { symbol: 'ORCL', name: 'Oracle', color: '#da1e28', mockBasePrice: 170 },
  { symbol: 'SAP', name: 'SAP', color: '#8a3ffc', mockBasePrice: 250 },
  { symbol: 'CRM', name: 'Salesforce', color: '#f1c21b', mockBasePrice: 290 },
];
