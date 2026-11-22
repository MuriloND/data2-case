import type { PendingIssue } from "./pending-issue";

export type SaleType = "nova" | "renovacao";
export type SaleStatus = "fechado" | "cancelado";
export type MonthKey = string; // YYYY-MM
export type IsoDate = string; // YYYY-MM-DD

export interface RawSaleRecord {
  lineNumber: number;
  data: string;
  vendedor: string;
  cliente: string;
  valor: string;
  tipo: string;
  status: string;
  obs: string;
}

export interface ParsedSaleRecord {
  id: string;
  batchId: string;
  lineNumber: number;
  raw: RawSaleRecord;
  dateISO: IsoDate | null;
  saleMonth: MonthKey | null;
  sellers: string[];
  formerEmployees: string[];
  unknownSellerTokens: string[];
  client: string;
  amountCents: number | null;
  suggestedAmountCents?: number;
  type: SaleType | null;
  status: SaleStatus | null;
  cancellationMonth: MonthKey | null;
  splitWeights: number[] | null;
  suggestedSplitWeights?: number[];
  duplicateOfRowId?: string;
  duplicateOfLineNumber?: number;
  issues: PendingIssue[];
}

export interface SaleResolution {
  rowId: string;
  action: "resolve" | "discard";
  dateISO?: IsoDate;
  sellers?: string[];
  isDirectSale?: boolean;
  amountCents?: number;
  type?: SaleType;
  status?: SaleStatus;
  cancellationMonth?: MonthKey | null;
  splitWeights?: number[];
  keepDuplicate?: boolean;
  resolvedAt?: string;
}
