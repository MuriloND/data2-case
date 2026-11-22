export type CsvDelimiter = "," | ";";

export function stripUtf8Bom(text: string): string {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}

export function detectCsvDelimiter(text: string): CsvDelimiter {
  let commaCount = 0;
  let semicolonCount = 0;
  let inQuotes = false;
  let sawContent = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      sawContent = true;
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (sawContent) {
        break;
      }
      continue;
    }

    if (ch !== " " && ch !== "\t") {
      sawContent = true;
    }

    if (!inQuotes) {
      if (ch === ",") {
        commaCount += 1;
      } else if (ch === ";") {
        semicolonCount += 1;
      }
    }
  }

  return semicolonCount > commaCount ? ";" : ",";
}
