import { createCalculateCommissionsUseCase } from "@/application/commissions/calculate-commissions.use-case";
import { createExportStatementUseCase } from "@/application/commissions/export-statement.use-case";
import { createIngestSalesUseCase } from "@/application/commissions/ingest-sales.use-case";
import type { WorkspaceRepositoryPort } from "@/domain/commissions/ports/workspace-repository.port";
import { createCsvSaleSourceAdapter } from "@/infrastructure/csv/csv-sale-source.adapter";
import { createCsvStatementExporter } from "@/infrastructure/exporters/csv-statement.exporter";
import { createWhatsAppStatementExporter } from "@/infrastructure/exporters/whatsapp-statement.exporter";
import { createLocalStorageWorkspaceRepository } from "@/infrastructure/persistence/local-storage-workspace.repository";

export interface CommissionServices {
  ingestSalesUseCase: ReturnType<typeof createIngestSalesUseCase<string>>;
  calculateCommissionsUseCase: ReturnType<typeof createCalculateCommissionsUseCase>;
  exportWhatsAppUseCase: ReturnType<typeof createExportStatementUseCase>;
  exportCsvUseCase: ReturnType<typeof createExportStatementUseCase>;
  workspaceRepository: WorkspaceRepositoryPort;
}

export function createCommissionServices(
  repository?: WorkspaceRepositoryPort
): CommissionServices {
  return {
    ingestSalesUseCase: createIngestSalesUseCase(createCsvSaleSourceAdapter()),
    calculateCommissionsUseCase: createCalculateCommissionsUseCase(),
    exportWhatsAppUseCase: createExportStatementUseCase(
      createWhatsAppStatementExporter()
    ),
    exportCsvUseCase: createExportStatementUseCase(
      createCsvStatementExporter()
    ),
    workspaceRepository: repository ?? createLocalStorageWorkspaceRepository(),
  };
}
