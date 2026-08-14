import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import {
  getResident,
  getResidentPayments,
  getResidentDocuments,
  getResidentActivity,
} from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResidentStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { PaymentForm } from "@/features/payments/payment-form";
import { DocumentUploadForm } from "@/features/documents/upload-form";
import { formatCurrency, formatDate, getInitials, maskIdNumber, formatMobile } from "@/lib/utils";
import { ArrowRightLeft, LogOut } from "lucide-react";
import type { ResidentStatus, PaymentStatus } from "@/types/database";

export default async function ResidentProfilePage({
  params,
}: {
  params: Promise<{ residentId: string }>;
}) {
  const { residentId } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const [resident, payments, documents, activity] = await Promise.all([
    getResident(residentId),
    getResidentPayments(residentId),
    getResidentDocuments(residentId),
    getResidentActivity(residentId),
  ]);

  if (!resident) notFound();

  const assignment = resident.bed_assignment as {
    bed?: { bed_label: string };
    room?: { room_number: string };
    property?: { name: string };
  } | null;
  const property = resident.property as { id: string; name: string } | null;
  const contacts = resident.contacts ?? [];
  const guardian = contacts.find((c) => c.contact_type === "guardian");
  const address = resident.permanent_address as { address_line?: string; city?: string; state?: string; pincode?: string } | null;
  const isActive = resident.status === "active" || resident.status === "notice_period";

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Residents", href: "/residents" },
        { label: resident.full_name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {resident.photo_url && <AvatarImage src={resident.photo_url} />}
            <AvatarFallback className="text-lg">{getInitials(resident.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{resident.full_name}</h1>
              <ResidentStatusBadge status={resident.status as ResidentStatus} />
            </div>
            <p className="text-muted-foreground">{formatMobile(resident.mobile)}</p>
            {property && (
              <p className="text-sm text-muted-foreground">
                {property.name}
                {assignment?.room && ` · Room ${assignment.room.room_number}-${assignment.bed?.bed_label}`}
              </p>
            )}
          </div>
        </div>
        {canWrite(user) && isActive && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/residents/${residentId}/transfer`}>
                <ArrowRightLeft className="h-4 w-4 mr-1" />Move
              </Link>
            </Button>
            <Button variant="destructive" size="sm" asChild>
              <Link href={`/residents/${residentId}/checkout`}>
                <LogOut className="h-4 w-4 mr-1" />Checkout
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="identification">ID</TabsTrigger>
          <TabsTrigger value="guardian">Guardian</TabsTrigger>
          <TabsTrigger value="stay">Stay</TabsTrigger>
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
              <InfoRow label="Name" value={guardian?.name ?? "—"} />
              <InfoRow label="Relation" value={guardian?.relation ?? "—"} />
              <InfoRow label="Phone" value={guardian?.phone ?? "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stay" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Property" value={property?.name ?? "—"} />
              <InfoRow label="Room / Bed" value={assignment?.room ? `${assignment.room.room_number} - Bed ${assignment.bed?.bed_label}` : "—"} />
              <InfoRow label="Joining Date" value={formatDate(resident.joining_date)} />
              <InfoRow label="Planned Checkout" value={formatDate(resident.planned_checkout_date)} />
              <InfoRow label="Monthly Rent" value={formatCurrency(Number(resident.monthly_rent))} />
              <InfoRow label="Security Deposit" value={formatCurrency(Number(resident.security_deposit_amount))} />
              <InfoRow label="Agreement" value={resident.agreement_status} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          {canWrite(user) && isActive && property && (
            <Card>
              <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
              <CardContent>
                <PaymentForm residentId={residentId} propertyId={property.id} defaultRent={Number(resident.monthly_rent)} />
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
                        <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)} · {p.payment_method}</p>
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
          {canWrite(user) && property && (
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
                <p className="text-muted-foreground text-sm">No documents uploaded</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium capitalize">{doc.document_type.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                      </div>
                      <a
                        href={`/api/documents/${doc.id}/signed-url`}
                        className="text-sm text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
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
