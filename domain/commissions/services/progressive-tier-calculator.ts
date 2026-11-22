import {
  MONTHLY_GOAL_CENTS,
  NOVA_BASE_RATE,
  NOVA_EXCESS_RATE,
  RENOVACAO_RATE,
} from "../constants";
import type { CommissionTier } from "../entities/ledger";

export interface NovaCommissionCalculation {
  baseAt5Cents: number;
  commAt5Cents: number;
  baseAt8Cents: number;
  commAt8Cents: number;
  commissionCents: number;
  tier: CommissionTier;
  nextAccumulatedNovaCents: number;
}

export interface RenovacaoCommissionCalculation {
  commissionCents: number;
  tier: CommissionTier;
}

const NOVA_BASE_PERCENT = Math.round(NOVA_BASE_RATE * 100);
const NOVA_EXCESS_PERCENT = Math.round(NOVA_EXCESS_RATE * 100);
const RENOVACAO_PERCENT = Math.round(RENOVACAO_RATE * 100);

export function calculateNovaCommission(
  assignedAmountCents: number,
  accumulatedNovaCents: number
): NovaCommissionCalculation {
  const remainingBaseRoom = Math.max(
    0,
    MONTHLY_GOAL_CENTS - accumulatedNovaCents
  );
  const baseAt5Cents = Math.min(assignedAmountCents, remainingBaseRoom);
  const baseAt8Cents = assignedAmountCents - baseAt5Cents;

  const commAt5Cents = Math.round((baseAt5Cents * NOVA_BASE_PERCENT) / 100);
  const commAt8Cents = Math.round((baseAt8Cents * NOVA_EXCESS_PERCENT) / 100);
  const commissionCents = commAt5Cents + commAt8Cents;

  let tier: CommissionTier;
  if (baseAt5Cents > 0 && baseAt8Cents > 0) {
    tier = "5% + 8%";
  } else if (baseAt8Cents > 0) {
    tier = "8%";
  } else {
    tier = "5%";
  }

  return {
    baseAt5Cents,
    commAt5Cents,
    baseAt8Cents,
    commAt8Cents,
    commissionCents,
    tier,
    nextAccumulatedNovaCents: accumulatedNovaCents + assignedAmountCents,
  };
}

export function calculateRenovacaoCommission(
  assignedAmountCents: number
): RenovacaoCommissionCalculation {
  return {
    commissionCents: Math.round(
      (assignedAmountCents * RENOVACAO_PERCENT) / 100
    ),
    tier: "2%",
  };
}
