"use client";

import { useState } from "react";
import type { CommissionReport } from "@/domain/commissions/entities/ledger";
import type { MonthKey } from "@/domain/commissions/entities/sale";
import { CommissionMatrixTable } from "./CommissionMatrixTable";
import { GoalProgressPanel } from "./GoalProgressPanel";

interface MonthlySummaryTabProps {
  report: CommissionReport;
  onOpenStatement: (seller: string, month: MonthKey | "all") => void;
}

export function MonthlySummaryTab({
  report,
  onOpenStatement,
}: MonthlySummaryTabProps) {
  const [selectedGoalMonth, setSelectedGoalMonth] = useState<MonthKey>("");

  const effectiveGoalMonth =
    selectedGoalMonth && report.months.includes(selectedGoalMonth)
      ? selectedGoalMonth
      : (report.months[report.months.length - 1] ?? "");

  return (
    <div className="space-y-6">
      <CommissionMatrixTable
        report={report}
        onSelectCell={onOpenStatement}
      />

      {effectiveGoalMonth && (
        <GoalProgressPanel
          report={report}
          selectedMonth={effectiveGoalMonth}
          onSelectMonth={setSelectedGoalMonth}
          onOpenStatement={(seller, month) => onOpenStatement(seller, month)}
        />
      )}
    </div>
  );
}
