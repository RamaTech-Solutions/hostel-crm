import { summarizeOccupancy, type OccupancyBed } from "@/lib/inventory/occupancy";
import { isEligibleForPeriod, monthEnd, monthStart } from "@/lib/finance/period";
import { isCurrentlyStaying } from "@/lib/residents/status";
import { hasOperationalContact, hasResidentIdentityDocument } from "@/lib/residents/attention";
import { calendarToday, isUpcomingPlannedCheckout } from "@/lib/dates/calendar";
import { rentReadiness, type RentReadiness } from "@/lib/dashboard/rent-readiness";

export type DashboardPropertyOption = { id: string; name: string };

export type DashboardCheckoutRow = {
  residentId: string;
  fullName: string;
  propertyName: string;
  stayLabel: string;
  plannedCheckoutDate: string;
};

export type DashboardReceiptRow = {
  id: string;
  residentName: string;
  amount: number;
  method: string;
  paymentDate: string;
};

export type DashboardMoveInRow = {
  residentId: string;
  fullName: string;
  propertyName: string;
  joiningDate: string;
};

export type DashboardPropertyOverviewRow = {
  id: string;
  name: string;
  occupancyPercent: number;
  occupied: number;
  vacant: number;
  capacity: number;
};

export type DashboardOverview = {
  selectedPropertyId: string | null;
  selectorProperties: DashboardPropertyOption[];
  totalProperties: number;
  totalRooms: number;
  occupancy: ReturnType<typeof summarizeOccupancy>;
  stayingCount: number;
  rent: RentReadiness;
  overdueCount: number;
  overdueAmount: number;
  upcomingCheckouts: DashboardCheckoutRow[];
  noticePeriodCount: number;
  missingDocumentsCount: number;
  missingContactCount: number;
  propertyOverview: DashboardPropertyOverviewRow[];
  recentReceipts: DashboardReceiptRow[];
  recentMoveIns: DashboardMoveInRow[];
  setup: {
    hasProperty: boolean;
    hasRooms: boolean;
    hasResidents: boolean;
    hasLedgerWork: boolean;
  };
};

type OccupancyRow = OccupancyBed & { id: string; property_id: string };

export function assembleDashboardOverview(input: {
  selectedPropertyId: string | null;
  selectorProperties: DashboardPropertyOption[];
  properties: DashboardPropertyOption[];
  totalRooms: number;
  occupancyBeds: OccupancyRow[];
  residents: Array<{
    id: string;
    status: string;
    monthly_rent: number;
    joining_date: string;
    planned_checkout_date: string | null;
    property_id: string | null;
    full_name: string;
    stayLabel?: string;
  }>;
  propertyStatusById: Record<string, string>;
  periodStart: string;
  currentCharges: Array<{ resident_id: string; outstanding: number }>;
  overdue: { count: number; amount: number };
  documentsByResident: Record<string, Array<{ document_type: string }>>;
  contactsByResident: Record<string, Array<{ contact_type: string; name?: string | null; phone?: string | null }>>;
  recentReceipts: DashboardReceiptRow[];
  today?: string;
}): DashboardOverview {
  const today = input.today ?? calendarToday();
  const scopedPropertyIds = new Set(input.properties.map((p) => p.id));
  const occupancyBeds = input.occupancyBeds.filter((bed) => scopedPropertyIds.has(bed.property_id));
  const occupancy = summarizeOccupancy(occupancyBeds);
  const staying = input.residents.filter(
    (r) => isCurrentlyStaying(r.status) && (!r.property_id || scopedPropertyIds.has(r.property_id))
  );
  const periodEnd = monthEnd(input.periodStart);

  const eligibleIds = staying
    .filter((r) =>
      isEligibleForPeriod({
        status: r.status,
        monthlyRent: Number(r.monthly_rent),
        joiningDate: r.joining_date.slice(0, 10),
        propertyId: r.property_id,
        propertyStatus: r.property_id ? input.propertyStatusById[r.property_id] : undefined,
        periodEnd,
      })
    )
    .map((r) => r.id);

  const chargedIds = [...new Set(input.currentCharges.map((c) => c.resident_id))];
  const outstanding = input.currentCharges.reduce((sum, c) => sum + Number(c.outstanding), 0);
  const rent = rentReadiness({ eligibleIds, chargedIds, outstanding });

  const propertyName = (id: string | null) =>
    input.properties.find((p) => p.id === id)?.name ?? "—";

  const noticePeriodCount = staying.filter((r) => r.status === "notice_period").length;
  const upcomingCheckouts = staying
    .filter((r) => isUpcomingPlannedCheckout(r.planned_checkout_date, today))
    .sort((a, b) => (a.planned_checkout_date ?? "").localeCompare(b.planned_checkout_date ?? ""))
    .slice(0, 5)
    .map((r) => ({
      residentId: r.id,
      fullName: r.full_name,
      propertyName: propertyName(r.property_id),
      stayLabel: r.stayLabel ?? "—",
      plannedCheckoutDate: r.planned_checkout_date!.slice(0, 10),
    }));

  let missingDocumentsCount = 0;
  let missingContactCount = 0;
  for (const resident of staying) {
    if (!hasResidentIdentityDocument(input.documentsByResident[resident.id] ?? [])) missingDocumentsCount += 1;
    if (!hasOperationalContact(input.contactsByResident[resident.id] ?? [])) missingContactCount += 1;
  }

  const propertyOverview = input.properties.map((property) => {
    const beds = occupancyBeds.filter((bed) => bed.property_id === property.id);
    const summary = summarizeOccupancy(beds);
    return {
      id: property.id,
      name: property.name,
      occupancyPercent: summary.occupancyPercent,
      occupied: summary.occupied,
      vacant: summary.vacant,
      capacity: summary.capacity,
    };
  });

  const recentMoveIns = [...staying]
    .sort((a, b) => b.joining_date.localeCompare(a.joining_date))
    .slice(0, 5)
    .map((r) => ({
      residentId: r.id,
      fullName: r.full_name,
      propertyName: propertyName(r.property_id),
      joiningDate: r.joining_date.slice(0, 10),
    }));

  return {
    selectedPropertyId: input.selectedPropertyId,
    selectorProperties: input.selectorProperties,
    totalProperties: input.properties.length,
    totalRooms: input.totalRooms,
    occupancy,
    stayingCount: staying.length,
    rent,
    overdueCount: input.overdue.count,
    overdueAmount: input.overdue.amount,
    upcomingCheckouts,
    noticePeriodCount,
    missingDocumentsCount,
    missingContactCount,
    propertyOverview,
    recentReceipts: input.recentReceipts.slice(0, 5),
    recentMoveIns,
    setup: {
      hasProperty: input.properties.length > 0,
      hasRooms: input.totalRooms > 0,
      hasResidents: staying.length > 0,
      hasLedgerWork: rent.kind === "complete" || rent.kind === "incomplete",
    },
  };
}

export { monthStart };
