"use client";

import { useMemo, useState } from "react";
import {
  bootstrapOrganization,
  completeOnboarding,
  completeOnboardingToResidents,
  createProperty,
  createRoom,
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

const STEPS = ["Business", "Property", "Structure", "Rooms & Beds", "Complete"] as const;
const PROPERTY_TYPES = ["Boys PG", "Girls PG", "Co-Living", "Hostel", "Mixed PG", "Other"] as const;

export type OnboardingStep = "business" | "property" | "structure" | "rooms" | "finish";

export function OnboardingWizard({
  needsBootstrap,
  ownerName,
  orgName,
  phone,
  initialProperties,
  initialFloors,
  roomCount,
}: {
  needsBootstrap: boolean;
  ownerName: string;
  orgName: string;
  phone: string;
  initialProperties: Property[];
  initialFloors: Floor[];
  roomCount: number;
}) {
  const derived = useMemo<OnboardingStep>(() => {
    if (needsBootstrap) return "business";
    if (!initialProperties.length) return "property";
    if (!initialFloors.length) return "structure";
    if (roomCount === 0) return "rooms";
    return "finish";
  }, [needsBootstrap, initialProperties.length, initialFloors.length, roomCount]);

  const [step, setStep] = useState<OnboardingStep>(derived);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState(initialProperties[0]?.id ?? "");
  const [floors, setFloors] = useState(initialFloors);

  const stepIndex =
    step === "business" ? 0 : step === "property" ? 1 : step === "structure" ? 2 : step === "rooms" ? 3 : 4;

  function fail(message: string | undefined) {
    setError(toUserError(message));
    setLoading(false);
  }

  async function handleBusiness(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    setLoading(true);
    setError(null);
    if (propertyId) {
      setLoading(false);
      setStep("structure");
      return;
    }
    const form = new FormData(e.currentTarget);
    form.set("status", "active");
    form.set("floor_count", "1");
    form.set("defer_floors", "1");
    form.set("notes", String(form.get("property_type") ?? "Other"));
    const result = await createProperty(form);
    if (result.error || !result.data) return fail(result.error ?? "Could not save the property.");
    setPropertyId(result.data.id);
    setLoading(false);
    setStep("structure");
  }

  async function handleStructure(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const count = Number(new FormData(e.currentTarget).get("floor_count") ?? 1);
    const result = await setupOnboardingFloors(propertyId, count);
    if (result.error || !result.data) return fail(result.error ?? "Could not save floors.");
    setFloors(result.data as Floor[]);
    setLoading(false);
    setStep("rooms");
  }

  async function handleRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("property_id", propertyId);
    const rent = String(form.get("monthly_rent") ?? "").trim();
    if (!rent) form.set("monthly_rent", "0");
    const result = await createRoom(form);
    if (result.error) return fail(result.error);
    setLoading(false);
    setStep("finish");
  }

  async function skipRooms() {
    setLoading(true);
    setError(null);
    await completeOnboarding();
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <OnboardingProgress steps={STEPS} currentIndex={stepIndex} />
        <CardTitle>
          {step === "business" && "Welcome to Awaasly"}
          {step === "property" && "Add your first property"}
          {step === "structure" && "How this building is structured"}
          {step === "rooms" && "Rooms & beds"}
          {step === "finish" && "Your Awaasly workspace is ready."}
        </CardTitle>
        <CardDescription>
          {step === "business" && "Required so we can name your workspace. You can change this later in Settings."}
          {step === "property" && "Required. Occupancy and rent tracking start from at least one property."}
          {step === "structure" && "Required. Floors help you place rooms correctly. You can rename them later."}
          {step === "rooms" && "Optional. Add one room now, or finish this later from the dashboard."}
          {step === "finish" && "You can add residents next and start daily operations."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        {step === "business" && (
          <form onSubmit={handleBusiness} className="space-y-4">
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
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        )}

        {step === "property" && (
          <form onSubmit={handleProperty} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property name</Label>
              <Input id="name" name="name" required placeholder="Main PG" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Property type</Label>
              <select
                id="property_type"
                name="property_type"
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                defaultValue="Mixed PG"
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line">Address</Label>
              <Input id="address_line" name="address_line" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" required defaultValue="Uttar Pradesh" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">PIN code</Label>
              <Input id="pincode" name="pincode" required pattern="\d{6}" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        )}

        {step === "structure" && (
          <form onSubmit={handleStructure} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="floor_count">How many floors does this property have?</Label>
              <Input id="floor_count" name="floor_count" type="number" min={1} max={50} defaultValue={floors.length || 2} />
            </div>
            <p className="text-sm text-muted-foreground">
              We will create Ground Floor plus numbered floors. You can rename them below after saving.
            </p>
            {floors.length > 0 && (
              <div className="space-y-2">
                {floors.map((floor) => (
                  <Input
                    key={floor.id}
                    defaultValue={floor.label}
                    onBlur={async (e) => {
                      const value = e.target.value.trim();
                      if (value && value !== floor.label) await updateFloorLabel(floor.id, value);
                    }}
                  />
                ))}
              </div>
            )}
            <Button type="submit" disabled={loading || !propertyId} className="w-full">
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        )}

        {step === "rooms" && (
          <form onSubmit={handleRoom} className="space-y-4">
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
              <Label htmlFor="room_number">Room number</Label>
              <Input id="room_number" name="room_number" required placeholder="101" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_type">Room type</Label>
              <select
                id="room_type"
                name="room_type"
                defaultValue="double"
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
                <option value="dorm">Dorm</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bed_capacity">Number of beds</Label>
                <Input id="bed_capacity" name="bed_capacity" type="number" min={1} defaultValue={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_rent">Monthly rent (optional)</Label>
                <Input id="monthly_rent" name="monthly_rent" type="number" min={0} placeholder="0" />
              </div>
            </div>
            <input type="hidden" name="gender_restriction" value="none" />
            <Button type="submit" disabled={loading || !propertyId} className="w-full">
              {loading ? "Adding room..." : "Set up now"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={loading} onClick={skipRooms}>
              I&apos;ll finish this later
            </Button>
          </form>
        )}

        {step === "finish" && (
          <div className="space-y-3">
            <Button className="w-full" disabled={loading} onClick={() => completeOnboarding()}>
              Go to Dashboard
            </Button>
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => completeOnboardingToResidents()}>
              Add First Resident
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
