import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAuthUser, canWrite, isOwner } from "@/lib/auth/get-user";
import {
  getResident,
  getResidentPayments,
  getResidentDocuments,
  getResidentActivity,
  getResidentStayHistory,
  getResidentCharges,
} from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResidentStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { PaymentForm } from "@/features/payments/payment-form";
import { LedgerStatusBadge } from "@/features/payments/ledger-status-badge";
import { VoidChargeButton } from "@/features/payments/void-charge-button";
import { DocumentUploadForm } from "@/features/documents/upload-form";
import { DeleteDocumentButton } from "@/features/documents/delete-document-button";
import { formatCurrency, formatDate, getInitials, maskIdNumber, formatMobile } from "@/lib/utils";
import { monthStart, formatPeriodLabel } from "@/lib/finance/period";
import { ArrowRightLeft, LogOut, Pencil } from "lucide-react";
import { hasOperationalContact, hasResidentIdentityDocument } from "@/lib/residents/attention";
import type { ResidentStatus, PaymentStatus } from "@/types/database";

export default async function ResidentProfilePage({
  params,
}: {
  params: Promise<{ residentId: string }>;
}) {
  const { residentId } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const [resident, payments, documents, activity, history, charges] = await Promise.all([
    getResident(residentId),
    getResidentPayments(residentId),
    getResidentDocuments(residentId),
    getResidentActivity(residentId),
    getResidentStayHistory(residentId),
    getResidentCharges(residentId),
  ]);

  if (!resident) notFound();

  const assignment = resident.bed_assignment as {
    bed?: { bed_label: string };
    room?: { room_number: string };
    property?: { name: string };
    start_date?: string;
  } | null;
  const property = resident.property as { id: string; name: string } | null;
  const contacts = resident.contacts ?? [];
  const guardian = contacts.find((c) => c.contact_type === "guardian");
  const emergency = contacts.find((c) => c.contact_type === "emergency");
  const address = resident.permanent_address as { address_line?: string; city?: string; state?: string; pincode?: string } | null;
  const isActive = resident.status === "active" || resident.status === "notice_period";
  const currentPeriod = monthStart(new Date());
  const currentCharge = charges.find((c) => c.period_start === currentPeriod);
  const totalOutstanding = charges.reduce((s, c) => s + Number(c.outstanding), 0);
  const profilePhoto = documents.find((doc) => doc.document_type === "profile_photo");
  const hasIdDocument = hasResidentIdentityDocument(documents);
  const hasContact = hasOperationalContact(contacts);
  const stayLabel = assignment?.room
    ? `Room ${assignment.room.room_number}-${assignment.bed?.bed_label}`
    : "No active bed";

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Residents", href: "/residents" },
        { label: resident.full_name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {profilePhoto && <AvatarImage src={`/api/documents/${profilePhoto.id}/content`} />}
            <AvatarFallback className="text-lg">{getInitials(resident.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[32px] font-semibold leading-10 tracking-tight">{resident.full_name}</h1>
              <ResidentStatusBadge status={resident.status as ResidentStatus} />
            </div>
            <p className="text-muted-foreground">{formatMobile(resident.mobile)}</p>
            {property && (
              <p className="text-sm text-muted-foreground">
                {property.name}
                {assignment?.room ? ` · ${stayLabel}` : ""}
              </p>
            )}
          </div>
        </div>
        {canWrite(user) && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/residents/${residentId}/edit`}>
                <Pencil className="h-4 w-4 mr-1" />Edit
              </Link>
            </Button>
            {isActive ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/residents/${residentId}/transfer`}>
                    <ArrowRightLeft className="h-4 w-4 mr-1" />Transfer
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" asChild>
                  <Link href={`/residents/${residentId}/checkout`}>
                    <LogOut className="h-4 w-4 mr-1" />Checkout
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="identification">ID</TabsTrigger>
          <TabsTrigger value="guardian">Contacts</TabsTrigger>
          <TabsTrigger value="stay">Stay</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Full Name" value={resident.full_name} />
              <InfoRow label="Date of Birth" value={formatDate(resident.date_of_birth)} />
              <InfoRow label="Gender" value={resident.gender ?? "—"} />
              <InfoRow label="Mobile" value={formatMobile(resident.mobile)} />
              <InfoRow label="Email" value={resident.email ?? "—"} />
              <InfoRow label="Company / College" value={resident.company_college ?? "—"} />
              <InfoRow label="Employee / Student ID" value={resident.employee_student_id ?? "—"} />
              <InfoRow label="Work address" value={resident.work_address ?? "—"} className="sm:col-span-2" />
              <InfoRow label="Remarks" value={resident.remarks ?? "—"} className="sm:col-span-2" />
              <InfoRow label="Address" value={address ? `${address.address_line}, ${address.city}, ${address.state} - ${address.pincode}` : "—"} className="sm:col-span-2" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identification" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
              <InfoRow label="ID Type" value={resident.id_type ?? "—"} />
              <InfoRow label="ID Number" value={maskIdNumber(resident.id_number_masked)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardian" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Guardian" value={guardian?.name ?? "—"} />
              <InfoRow label="Relation" value={guardian?.relation ?? "—"} />
              <InfoRow label="Guardian phone" value={guardian?.phone ?? "—"} />
              <InfoRow label="Emergency contact" value={emergency?.name ?? "—"} />
              <InfoRow label="Emergency phone" value={emergency?.phone ?? "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stay" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Complete profile</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>✓ Basic details</p>
              <p>{assignment ? "✓ Stay assigned" : "○ Stay assigned"}</p>
              <p>{hasContact ? "✓ Emergency or guardian contact" : "○ Add emergency or guardian contact"}</p>
              <p>{hasIdDocument ? "✓ Resident document" : "○ Upload resident document"}</p>
              <p>{profilePhoto ? "✓ Photo" : "○ Add photo"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Property" value={assignment?.property?.name ?? property?.name ?? "—"} />
              <InfoRow label="Room / Bed" value={assignment?.room ? `${assignment.room.room_number} - Bed ${assignment.bed?.bed_label}` : "—"} />
              <InfoRow label="Move-in" value={formatDate(assignment?.start_date ?? resident.joining_date)} />
              <InfoRow label="Planned checkout" value={formatDate(resident.planned_checkout_date)} />
              <InfoRow label="Monthly rent" value={formatCurrency(Number(resident.monthly_rent))} />
              <InfoRow label="Security deposit" value={formatCurrency(Number(resident.security_deposit_amount))} />
              <InfoRow
                label="Current period"
                value={currentCharge ? `${formatPeriodLabel(currentCharge.period_start)} · ${currentCharge.ledger_status}` : "Rent not generated"}
              />
              <InfoRow label="Total outstanding" value={formatCurrency(totalOutstanding)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Stay history</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {history.assignments.map((row, index) => (
                <div key={row.id}>
                  {index === 0 ? "Move in" : row.end_date ? "Stay ended" : "Current stay"}
                  {": "}
                  {(row.property as { name?: string } | null)?.name}
                  {" · Room "}
                  {(row.room as { room_number?: string } | null)?.room_number}
                  {" · Bed "}
                  {(row.bed as { bed_label?: string } | null)?.bed_label}
                  {" · "}
                  {formatDate(row.start_date)}
                  {row.end_date ? ` → ${formatDate(row.end_date)}` : ""}
                </div>
              ))}
              {history.transfers.map((row) => (
                <div key={row.id}>Room transfer · {formatDate(row.transfer_date)}{row.reason ? ` · ${row.reason}` : ""}</div>
              ))}
              {resident.status === "checked_out" ? <div>Checkout · {formatDate(resident.planned_checkout_date)}</div> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Rent ledger</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Monthly rent (term): {formatCurrency(Number(resident.monthly_rent))}</p>
              <p>Current period: {currentCharge ? formatPeriodLabel(currentCharge.period_start) : "Rent not generated"}</p>
              {currentCharge ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>Status</span>
                  <LedgerStatusBadge status={currentCharge.ledger_status} />
                  <span>Outstanding {formatCurrency(Number(currentCharge.outstanding))}</span>
                  {isOwner(user) ? (
                    <VoidChargeButton
                      chargeId={currentCharge.id}
                      residentId={residentId}
                      allocatedPaid={Number(currentCharge.allocated_paid)}
                      outstanding={Number(currentCharge.outstanding)}
                      voidedAt={currentCharge.voided_at}
                    />
                  ) : null}
                </div>
              ) : null}
              {isOwner(user) ? (
                <ul className="space-y-2">
                  {charges
                    .filter(
                      (c) =>
                        c.id !== currentCharge?.id &&
                        Number(c.allocated_paid) === 0 &&
                        Number(c.outstanding) > 0 &&
                        !c.voided_at
                    )
                    .map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {formatPeriodLabel(c.period_start)} · {formatCurrency(Number(c.outstanding))} outstanding
                        </span>
                        <VoidChargeButton
                          chargeId={c.id}
                          residentId={residentId}
                          allocatedPaid={Number(c.allocated_paid)}
                          outstanding={Number(c.outstanding)}
                          voidedAt={c.voided_at}
                        />
                      </li>
                    ))}
                </ul>
              ) : null}
              <p className="font-medium">Total outstanding: {formatCurrency(totalOutstanding)}</p>
              {Number(resident.monthly_rent) <= 0 ? (
                <p className="text-muted-foreground">Monthly rent is ₹0, so regular rent charges are not generated. Set rent on Edit profile if this resident should be billed.</p>
              ) : null}
            </CardContent>
          </Card>
          {canWrite(user) && property && (
            <Card>
              <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
              <CardContent>
                <PaymentForm
                  residentId={residentId}
                  propertyId={property.id}
                  defaultRent={Number(resident.monthly_rent)}
                  charges={charges}
                />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No payments recorded</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{formatCurrency(Number(p.amount))}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)} · {p.payment_method}{!p.rent_charge_id ? " · Unallocated (legacy)" : ""}</p>
                      </div>
                      <PaymentStatusBadge status={p.status as PaymentStatus} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          {canWrite(user) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Upload Document</CardTitle></CardHeader>
              <CardContent>
                <DocumentUploadForm residentId={residentId} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm leading-[22px] text-muted-foreground">No documents yet. Upload Aadhaar or other records to keep them with this resident.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 border-b pb-2">
                      <div>
                        <p className="font-medium capitalize">{doc.document_type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          href={`/api/documents/${doc.id}/content`}
                          className="text-sm font-medium underline-offset-4 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                        <a
                          href={`/api/documents/${doc.id}/content?download=1`}
                          className="text-sm font-medium underline-offset-4 hover:underline"
                        >
                          Download
                        </a>
                        {canWrite(user) ? (
                          <DeleteDocumentButton documentId={doc.id} residentId={residentId} />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {activity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity recorded</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground shrink-0">{formatDate(log.created_at)}</span>
                      <span className="capitalize">{log.action.replace("_", " ")} — {log.entity_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
