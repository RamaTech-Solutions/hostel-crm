export type RentReadinessKind = "no_eligible" | "not_generated" | "incomplete" | "complete";

export type RentReadiness = {
  kind: RentReadinessKind;
  eligible: number;
  charged: number;
  missing: number;
  outstanding: number;
};

export function rentReadiness(input: {
  eligibleIds: string[];
  chargedIds: string[];
  outstanding: number;
}): RentReadiness {
  const eligible = new Set(input.eligibleIds);
  const charged = new Set(input.chargedIds);
  const missing = [...eligible].filter((id) => !charged.has(id)).length;

  if (eligible.size === 0 && charged.size === 0) {
    return { kind: "no_eligible", eligible: 0, charged: 0, missing: 0, outstanding: 0 };
  }
  if (eligible.size > 0 && charged.size === 0) {
    return { kind: "not_generated", eligible: eligible.size, charged: 0, missing: eligible.size, outstanding: 0 };
  }
  if (missing > 0) {
    return {
      kind: "incomplete",
      eligible: eligible.size,
      charged: charged.size,
      missing,
      outstanding: input.outstanding,
    };
  }
  return {
    kind: "complete",
    eligible: eligible.size,
    charged: charged.size,
    missing: 0,
    outstanding: input.outstanding,
  };
}

export function canShowGenerateRentAction(input: { missing: number; canWrite: boolean; allPropertiesScope: boolean }): boolean {
  return input.canWrite && input.allPropertiesScope && input.missing > 0;
}
