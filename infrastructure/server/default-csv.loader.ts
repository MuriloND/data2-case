import fs from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";

export interface DefaultCsvPayload {
  fileName: string;
  csvText: string;
}

export async function loadDefaultCsv(): Promise<DefaultCsvPayload | null> {
  "use cache";
  cacheLife("max");

  const filePath = path.join(
    process.cwd(),
    "test_files",
    "YMwngYvqunGNvAf1zJNut.csv"
  );

  try {
    const csvText = await fs.readFile(filePath, "utf-8");
    return {
      fileName: "YMwngYvqunGNvAf1zJNut.csv",
      csvText,
    };
  } catch {
    return null;
  }
}
