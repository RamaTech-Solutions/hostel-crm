export function dashboardDestinations(propertyId: string | null, periodStart: string) {
  const residents = new URLSearchParams({ status: "staying" });
  const payments = new URLSearchParams({ period: periodStart });
  const overdue = new URLSearchParams({ status: "overdue" });
  if (propertyId) {
    residents.set("property", propertyId);
    payments.set("property", propertyId);
    overdue.set("property", propertyId);
  }
  return {
    properties: "/properties",
    occupancy: propertyId ? `/rooms?propertyId=${propertyId}` : "/properties",
    residents: `/residents?${residents.toString()}`,
    outstanding: `/payments?${payments.toString()}`,
    overdue: `/payments?${overdue.toString()}`,
    vacantBeds: propertyId ? `/rooms?propertyId=${propertyId}` : "/rooms",
    payments: propertyId ? `/payments?property=${propertyId}&period=${periodStart}` : `/payments?period=${periodStart}`,
  };
}
