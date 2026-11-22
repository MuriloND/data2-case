import type { MonthKey, SaleType } from "./sale";

export type IssueCode =
  | "INVALID_DATE"
  | "MISSING_SELLER"
  | "UNKNOWN_SELLER"
  | "FORMER_EMPLOYEE"
  | "INVALID_VALUE"
  | "UNCONFIRMED_VALUE"
  | "MISSING_TYPE"
  | "UNKNOWN_TYPE"
  | "UNKNOWN_STATUS"
  | "MISSING_CANCELLATION_MONTH"
  | "INVALID_CANCELLATION_MONTH"
  | "AMBIGUOUS_SPLIT"
  | "DUPLICATE_SUSPECT";

export type IssueField =
  | "data"
  | "vendedor"
  | "valor"
  | "tipo"
  | "status"
  | "obs"
  | "registro";

export interface IssueSuggestion {
  label: string;
  reason: string;
  type?: SaleType;
  amountCents?: number;
  cancellationMonth?: MonthKey;
  splitWeights?: number[];
  isDirectSale?: boolean;
  keepDuplicate?: boolean;
}

export interface PendingIssue {
  code: IssueCode;
  field: IssueField;
  rawValue: string;
  message: string;
  unknownTokens?: string[];
  suggestion?: IssueSuggestion;
}
