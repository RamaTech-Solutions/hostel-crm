import { redirect, notFound } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getResident } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NoticeForm } from "@/features/residents/notice-form";
import { canGiveOrUpdateNotice } from "@/lib/residents/notice-lifecycle";

export default async function NoticePage({
  params,
}: {
  params: Promise<{ residentId: string }>;
}) {
  const { residentId } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!canWrite(user)) redirect(`/residents/${residentId}`);

  const resident = await getResident(residentId);
  if (!resident) notFound();
  if (!canGiveOrUpdateNotice(resident.status)) redirect(`/residents/${residentId}`);

  const isUpdate = resident.status === "notice_period";

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Residents", href: "/residents" },
        { label: resident.full_name, href: `/residents/${residentId}` },
        { label: isUpdate ? "Update notice" : "Give notice" },
      ]} />
      <h1 className="mb-6 text-[32px] font-semibold leading-10 tracking-tight">
        {isUpdate ? "Update notice" : "Give notice"} — {resident.full_name}
      </h1>
      <NoticeForm
        residentId={residentId}
        plannedCheckoutDate={resident.planned_checkout_date}
        isUpdate={isUpdate}
      />
    </div>
  );
}
