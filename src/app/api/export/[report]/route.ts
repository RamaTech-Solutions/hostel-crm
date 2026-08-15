import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import {
  getOccupancyByProperty,
  getResidents,
  getPayments,
  getAllBeds,
} from "@/lib/queries";
import { classifyBed } from "@/lib/inventory/occupancy";

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { report } = await params;
  let csv = "";
  let filename = "report.csv";

  switch (report) {
    case "occupancy": {
      const data = await getOccupancyByProperty(user);
      csv = toCsv([
        ["Property", "Occupied", "Vacant", "Unavailable", "Capacity", "Total Beds", "Occupancy %"],
        ...data.map((d) => [
          d.name,
          String(d.occupied),
          String(d.vacant),
          String(d.unavailable),
          String(d.capacity),
          String(d.total),
          String(d.occupancy),
        ]),
      ]);
      filename = "occupancy-report.csv";
      break;
    }
    case "residents": {
      const { rows: data } = await getResidents(user, { status: "staying" });
      csv = toCsv([
        ["Name", "Mobile", "Property", "Joining Date", "Monthly Rent"],
        ...data.map((r) => [
          r.full_name,
          r.mobile,
          (r.property as { name: string })?.name ?? "",
          r.joining_date,
          String(r.monthly_rent),
        ]),
      ]);
      filename = "residents-report.csv";
      break;
    }
    case "payments": {
      const { rows: data } = await getPayments(user);
      csv = toCsv([
        ["Date", "Resident", "Property", "Amount", "Status", "Method"],
        ...data.map((p) => [
          p.payment_date,
          (p.resident as { full_name: string })?.full_name ?? "",
          (p.property as { name: string })?.name ?? "",
          String(p.amount),
          p.status,
          p.payment_method,
        ]),
      ]);
      filename = "receipts-report.csv";
      break;
    }
    case "available-beds": {
      const data = (await getAllBeds(user)).filter((b) =>
        classifyBed({ status: b.status, hasActiveAssignment: Boolean(b.hasActiveAssignment) }) === "vacant"
      );
      csv = toCsv([
        ["Property", "Room", "Bed"],
        ...data.map((b) => [
          (b.property as { name: string })?.name ?? "",
          (b.room as { room_number: string })?.room_number ?? "",
          b.bed_label,
        ]),
      ]);
      filename = "available-beds.csv";
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
