export function generateFloorRows(propertyId: string, organizationId: string, count: number) {
  const safe = Math.min(50, Math.max(1, Math.floor(count)));
  return Array.from({ length: safe }, (_, i) => ({
    property_id: propertyId,
    organization_id: organizationId,
    floor_number: i,
    label: i === 0 ? "Ground Floor" : `Floor ${i}`,
  }));
}

export function nextFloorNumber(existingNumbers: number[]) {
  if (!existingNumbers.length) return 0;
  return Math.max(...existingNumbers) + 1;
}

export function defaultFloorLabel(floorNumber: number) {
  return floorNumber === 0 ? "Ground Floor" : `Floor ${floorNumber}`;
}
