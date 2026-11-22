import type {
  StatementExporterPort,
  StatementExportPayload,
  StatementExportResult,
} from "../../domain/commissions/ports/statement-exporter.port";

export class ExportStatementUseCase {
  constructor(private readonly exporter: StatementExporterPort) {}

  execute(payload: StatementExportPayload): StatementExportResult {
    return this.exporter.export(payload);
  }
}

export function createExportStatementUseCase(
  exporter: StatementExporterPort
): ExportStatementUseCase {
  return new ExportStatementUseCase(exporter);
}
