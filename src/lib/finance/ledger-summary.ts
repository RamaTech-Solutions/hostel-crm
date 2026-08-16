export function periodChargeTotals(
  charges: Array<{ amount_due: unknown; allocated_paid: unknown; outstanding: unknown }>
) {
  const ledgerGenerated = charges.length > 0;
  const due = charges.reduce((sum, row) => sum + Number(row.amount_due), 0);
  const collected = charges.reduce((sum, row) => sum + Number(row.allocated_paid), 0);
  const outstanding = charges.reduce((sum, row) => sum + Number(row.outstanding), 0);
  return {
    ledgerGenerated,
    due: ledgerGenerated ? due : 0,
    collected: ledgerGenerated ? collected : 0,
    outstanding: ledgerGenerated ? outstanding : 0,
  };
}
