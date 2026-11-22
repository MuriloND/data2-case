import type { CsvDelimiter } from "./delimiter-detector";

export interface TokenizedCsvRow {
  lineNumber: number;
  fields: string[];
}

interface TokenizerState {
  currentFields: string[];
  currentField: string;
  inQuotes: boolean;
  physicalLine: number;
  rowStartLine: number;
  hasFieldData: boolean;
  rows: TokenizedCsvRow[];
}

function createInitialState(): TokenizerState {
  return {
    currentFields: [],
    currentField: "",
    inQuotes: false,
    physicalLine: 1,
    rowStartLine: 1,
    hasFieldData: false,
    rows: [],
  };
}

function isBlankRow(fields: readonly string[]): boolean {
  return fields.every((field) => field.trim() === "");
}

function markRowStartIfNeeded(state: TokenizerState): void {
  if (!state.hasFieldData && state.currentFields.length === 0) {
    state.rowStartLine = state.physicalLine;
  }
}

function flushCurrentRow(state: TokenizerState): void {
  const fields = [...state.currentFields, state.currentField];
  if (!isBlankRow(fields)) {
    state.rows.push({
      lineNumber: state.rowStartLine,
      fields,
    });
  }
  state.currentFields = [];
  state.currentField = "";
  state.hasFieldData = false;
}

function consumeQuotedChar(
  text: string,
  index: number,
  state: TokenizerState
): number {
  const ch = text[index];

  if (ch === '"') {
    if (text[index + 1] === '"') {
      state.currentField += '"';
      return index + 1;
    }
    state.inQuotes = false;
    return index;
  }

  if (ch === "\r") {
    state.currentField += "\n";
    state.physicalLine += 1;
    return text[index + 1] === "\n" ? index + 1 : index;
  }

  if (ch === "\n") {
    state.currentField += "\n";
    state.physicalLine += 1;
    return index;
  }

  state.currentField += ch;
  return index;
}

function consumeUnquotedChar(
  text: string,
  index: number,
  delimiter: CsvDelimiter,
  state: TokenizerState
): number {
  const ch = text[index];

  if (ch === '"') {
    markRowStartIfNeeded(state);
    state.inQuotes = true;
    state.hasFieldData = true;
    return index;
  }

  if (ch === delimiter) {
    markRowStartIfNeeded(state);
    state.currentFields.push(state.currentField);
    state.currentField = "";
    state.hasFieldData = true;
    return index;
  }

  if (ch === "\r" || ch === "\n") {
    const nextIndex = ch === "\r" && text[index + 1] === "\n" ? index + 1 : index;
    flushCurrentRow(state);
    state.physicalLine += 1;
    state.rowStartLine = state.physicalLine;
    return nextIndex;
  }

  markRowStartIfNeeded(state);
  state.currentField += ch;
  state.hasFieldData = true;
  return index;
}

export function tokenizeCsv(
  text: string,
  delimiter: CsvDelimiter
): TokenizedCsvRow[] {
  const state = createInitialState();

  for (let i = 0; i < text.length; i += 1) {
    i = state.inQuotes
      ? consumeQuotedChar(text, i, state)
      : consumeUnquotedChar(text, i, delimiter, state);
  }

  if (
    state.hasFieldData ||
    state.currentFields.length > 0 ||
    state.currentField !== ""
  ) {
    flushCurrentRow(state);
  }

  return state.rows;
}
