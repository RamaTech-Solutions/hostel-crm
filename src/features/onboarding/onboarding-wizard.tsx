"use client";

import { useMemo, useState } from "react";
import {
  addOnboardingFloor,
  bootstrapOrganization,
  completeOnboarding,
  completeOnboardingToResidents,
  getOnboardingSummary,
  saveOnboardingFirstProperty,
  saveOnboardingRoom,
  setupOnboardingFloors,
  updateFloorLabel,
  updateOnboardingWorkspace,
} from "@/lib/actions";
import { toUserError } from "@/lib/user-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingProgress } from "@/components/ui/onboarding-progress";
import type { Floor, Property } from "@/types/database";

const STEPS = ["Welcome", "Property", "Floors", "Rooms", "Finish"] as const;
const PROPERTY_TYPES = ["Boys PG", "Girls PG", "Co-Living", "Hostel", "Mixed PG", "Other"] as const;

export type OnboardingStep = "welcome" | "property" | "floors" | "rooms" | "finish";

type RoomRow = { id: string; room_number: string; bed_capacity: number; floor_id: string | null; beds?: { id: string }[] };

export function OnboardingWizard({
  needsBootstrap,
  ownerName,
  orgName,
  phone,
  initialProperties,
  initialFloors,
  initialRooms,
}: {
  needsBootstrap: boolean;
  ownerName: string;
  orgName: string;
  phone: string;
  initialProperties: Property[];
  initialFloors: Floor[];
  initialRooms: RoomRow[];
}) {
  const derived = useMemo<OnboardingStep>(() => {
    if (needsBootstrap) return "welcome";
    if (!initialProperties.length) return "property";
    if (!initialFloors.length) return "floors";
    return "rooms";
  }, [needsBootstrap, initialProperties.length, initialFloors.length]);

  const [step, setStep] = useState<OnboardingStep>(derived);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState(initialProperties[0] ?? null);
  const [floors, setFloors] = useState(initialFloors);
  const [rooms, setRooms] = useState(initialRooms);
  const [summary, setSummary] = useState<{
    propertyName: string;
    floorCount: number;
    roomCount: number;
    bedCount: number;
  } | null>(null);
  const [customFloor, setCustomFloor] = useState("");

  const propertyId = property?.id ?? "";
  const stepIndex =
    step === "welcome" ? 0 : step === "property" ? 1 : step === "floors" ? 2 : step === "rooms" ? 3 : 4;

  function fail(message: string | undefined) {
    setError(toUserError(message, "Something went wrong. Please try again."));
    setLoading(false);
  }

  async function loadSummary(id: string) {
    const result = await getOnboardingSummary(id);
    if (result.data) setSummary(result.data);
    return result.data;
  }

  async function handleWelcome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    if (needsBootstrap) {
      const result = await bootstrapOrganization({
        organizationName: String(form.get("organization_name") ?? ""),
        fullName: String(form.get("full_name") ?? ""),
        phone: String(form.get("phone") ?? ""),
      });
      if (result.error) return fail(result.error);
    } else {
      const result = await updateOnboardingWorkspace(form);
      if (result.error) return fail(result.error);
    }
    setLoading(false);
    setStep("property");
  }

  async function handleProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("notes", String(form.get("property_type") ?? "Other"));
    form.set("floor_count", String(property?.floor_count || 1));
    if (propertyId) form.set("property_id", propertyId);
    const result = await saveOnboardingFirstProperty(form);
    if (result.error || !result.data) return fail(result.error ?? "We couldn't save your property. Please try again.");
    setProperty(result.data as Property);
    setLoading(false);
    setStep("floors");
  }

  async function handleGenerateFloors(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || !propertyId) return;
    setLoading(true);
    setError(null);
    const count = Number(new FormData(e.currentTarget).get("floor_count") ?? 1);
    const result = await setupOnboardingFloors(propertyId, count);
    if (result.error || !result.data) return fail(result.error ?? "We couldn't save floors. Please try again.");
    setFloors(result.data as Floor[]);
    setLoading(false);
  }

  async function handleAddFloor() {
    if (loading || !propertyId) return;
    setLoading(true);
    setError(null);
    const result = await addOnboardingFloor(propertyId, customFloor);
    if (result.error || !result.data) return fail(result.error ?? "We couldn't add that floor. Please try again.");
    setFloors(result.data as Floor[]);
    setCustomFloor("");
    setLoading(false);
  }

  async function goToRooms() {
    if (!floors.length) {
      setError("Add at least one floor to continue.");
      return;
    }
    setError(null);
    setStep("rooms");
  }

  async function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || !propertyId) return;
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("property_id", propertyId);
    const rent = String(form.get("monthly_rent") ?? "").trim();
    if (!rent) form.set("monthly_rent", "0");
    const result = await saveOnboardingRoom(form);
    if (result.error || !result.data) return fail(result.error ?? "We couldn't create these rooms. Your previous setup is still safe.");
    setRooms(result.data as RoomRow[]);
    (e.currentTarget as HTMLFormElement).reset();
    setLoading(false);
  }

  async function goToFinish(fromSkip = false) {
    if (!fromSkip && rooms.length === 0) {
      setError("Add at least one room, or choose Skip for now.");
      return;
    }
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    const data = await loadSummary(propertyId);
    setLoading(false);
    if (!data) {
      setError("We couldn't load your setup summary. Please try again.");
      return;
    }
    setStep("finish");
  }

  async function finish(kind: "dashboard" | "resident") {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = kind === "resident" ? await completeOnboardingToResidents() : await completeOnboarding();
    if (result?.error) return fail(result.error);
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <OnboardingProgress steps={STEPS} currentIndex={stepIndex} />
        <CardTitle>
          {step === "welcome" && "Let's set up your first property."}
          {step === "property" && "Add your first property"}
          {step === "floors" && "How this building is structured"}
          {step === "rooms" && "Rooms & beds"}
          {step === "finish" && "Your Awaasly workspace is ready."}
        </CardTitle>
        <CardDescription>
          {step === "welcome" && "Add your property, floors and rooms so Awaasly can start tracking occupancy and residents."}
          {step === "property" && "Required. Occupancy and rent tracking start from at least one property."}
          {step === "floors" && "Required. Floors help you place rooms correctly. You can rename them later."}
          {step === "rooms" && "Add rooms one by one. Skip only if you will finish rooms from the dashboard."}
          {step === "finish" && (summary && summary.roomCount === 0
            ? "Rooms & beds setup is incomplete. You can add them from the dashboard."
            : "You can add residents next and start daily operations.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        {step === "welcome" && (
          <form onSubmit={handleWelcome} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Owner name</Label>
              <Input id="full_name" name="full_name" required defaultValue={ownerName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization_name">Business / organization name</Label>
              <Input id="organization_name" name="organization_name" required defaultValue={orgName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" name="phone" defaultValue={phone} pattern="\d{10}" />
            </div>
            <Button type="submit" disabled={loading} className="w-full min-h-11">
              {loading ? "Saving..." : "Start Setup"}
            </Button>
          </form>
        )}

        {step === "property" && (
          <form onSubmit={handleProperty} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property name</Label>
              <Input id="name" name="name" required defaultValue={property?.name ?? ""} placeholder="Sunrise PG" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Property type</Label>
              <select
                id="property_type"
                name="property_type"
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                defaultValue={property?.notes || "Mixed PG"}
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line">Address</Label>
              <Input id="address_line" name="address_line" required defaultValue={property?.address_line ?? ""} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required defaultValue={property?.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" required defaultValue={property?.state || "Uttar Pradesh"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">PIN code</Label>
              <Input id="pincode" name="pincode" required pattern="\d{6}" defaultValue={property?.pincode ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact number (optional)</Label>
              <Input id="contact_phone" name="contact_phone" inputMode="numeric" pattern="\d{10}" defaultValue={property?.contact_phone ?? ""} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="min-h-11 sm:flex-1" onClick={() => setStep("welcome")}>
                Back
              </Button>
              <Button type="submit" disabled={loading} className="min-h-11 sm:flex-1">
                {loading ? "Saving..." : "Continue"}
              </Button>
            </div>
          </form>
        )}

        {step === "floors" && (
          <div className="space-y-4">
            {floors.length === 0 ? (
              <form onSubmit={handleGenerateFloors} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="floor_count">How many floors does this property have?</Label>
                  <Input id="floor_count" name="floor_count" type="number" min={1} max={50} defaultValue={2} />
                </div>
                <p className="text-sm text-muted-foreground">
                  We will create Ground Floor plus numbered floors. You can rename them after saving.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" className="min-h-11 sm:flex-1" onClick={() => setStep("property")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading || !propertyId} className="min-h-11 sm:flex-1">
                    {loading ? "Saving..." : "Create floors"}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="space-y-2">
                  {floors.map((floor) => (
                    <div key={floor.id} className="space-y-1">
                      <Label htmlFor={`floor-${floor.id}`} className="sr-only">Rename {floor.label}</Label>
                      <Input
                        id={`floor-${floor.id}`}
                        defaultValue={floor.label}
                        onBlur={async (e) => {
                          const value = e.target.value.trim();
                          if (value && value !== floor.label) await updateFloorLabel(floor.id, value);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customFloor}
                    onChange={(e) => setCustomFloor(e.target.value)}
                    placeholder="Basement, Terrace…"
                    aria-label="Custom floor name"
                  />
                  <Button type="button" variant="outline" className="min-h-11" disabled={loading} onClick={handleAddFloor}>
                    Add Floor
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" className="min-h-11 sm:flex-1" onClick={() => setStep("property")}>
                    Back
                  </Button>
                  <Button type="button" className="min-h-11 sm:flex-1" disabled={loading} onClick={goToRooms}>
                    Continue
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "rooms" && (
          <div className="space-y-4">
            <form onSubmit={handleAddRoom} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="room_number">Room</Label>
                  <Input id="room_number" name="room_number" required placeholder="101" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor_id">Floor</Label>
                  <select
                    id="floor_id"
                    name="floor_id"
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    {floors.map((floor) => (
                      <option key={floor.id} value={floor.id}>{floor.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bed_capacity">Beds</Label>
                  <Input id="bed_capacity" name="bed_capacity" type="number" min={1} max={20} defaultValue={2} required />
                </div>
              </div>
              <input type="hidden" name="room_type" value="other" />
              <input type="hidden" name="gender_restriction" value="none" />
              <Button type="submit" disabled={loading || !propertyId} className="min-h-11 w-full">
                {loading ? "Saving..." : "Add"}
              </Button>
            </form>
            {rooms.length > 0 && (
              <ul className="space-y-2 text-sm">
                {rooms.map((room) => (
                  <li key={room.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>{room.room_number}</span>
                    <span className="text-muted-foreground">{room.beds?.length ?? room.bed_capacity} beds</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="min-h-11 sm:flex-1" onClick={() => setStep("floors")}>
                Back
              </Button>
              <Button type="button" className="min-h-11 sm:flex-1" disabled={loading || rooms.length === 0} onClick={() => goToFinish(false)}>
                Continue
              </Button>
            </div>
            <Button type="button" variant="ghost" className="min-h-11 w-full" disabled={loading} onClick={() => goToFinish(true)}>
              Skip for now
            </Button>
          </div>
        )}

        {step === "finish" && summary && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">{summary.propertyName}</p>
              <p className="mt-1 text-muted-foreground">
                {summary.floorCount} Floors · {summary.roomCount} Rooms · {summary.bedCount} Beds
              </p>
              {summary.roomCount === 0 ? (
                <p className="mt-2 text-foreground">Rooms & beds setup is incomplete.</p>
              ) : null}
            </div>
            <Button className="min-h-11 w-full" disabled={loading} onClick={() => finish("dashboard")}>
              {loading ? "Opening..." : "Go to Dashboard"}
            </Button>
            <Button variant="outline" className="min-h-11 w-full" disabled={loading} onClick={() => finish("resident")}>
              Add First Resident
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("rooms")}>
              Back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
