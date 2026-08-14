"use client";

import { useEffect, useState } from "react";
import { bootstrapOrganization, completeOnboarding, createProperty, createRoom } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Property } from "@/types/database";

type Step = "workspace" | "property" | "rooms" | "finish";

export function OnboardingWizard({
  needsBootstrap,
  initialProperties,
}: {
  needsBootstrap: boolean;
  initialProperties: Property[];
}) {
  const [step, setStep] = useState<Step>(needsBootstrap ? "workspace" : initialProperties.length ? "rooms" : "property");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState(initialProperties[0]?.id ?? "");

  useEffect(() => {
    if (!needsBootstrap) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await bootstrapOrganization();
      if (cancelled) return;
      setLoading(false);
      if (result.error && result.error !== "Organization name is required") {
        setError(result.error);
        return;
      }
      if (!result.error) {
        setStep("property");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsBootstrap]);

  async function handleWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const result = await bootstrapOrganization({
      organizationName: String(form.get("organization_name") ?? ""),
      fullName: String(form.get("full_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("property");
  }

  async function handleProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createProperty(new FormData(e.currentTarget));
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error ?? "Could not create property");
      return;
    }
    setPropertyId(result.data.id);
    setStep("rooms");
  }

  async function handleRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("property_id", propertyId);
    const result = await createRoom(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStep("finish");
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Set up Awaasly</CardTitle>
        <CardDescription>
          Add your first property, floors, rooms and beds. You can add residents after this.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        {step === "workspace" && (
          <form onSubmit={handleWorkspace} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm your workspace details. If signup already captured these, we try automatically.
            </p>
            <div className="space-y-2">
              <Label htmlFor="full_name">Your name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization_name">Business / PG name</Label>
              <Input id="organization_name" name="organization_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" name="phone" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating workspace..." : "Continue"}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" name="pincode" required pattern="\d{6}" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor_count">Floors</Label>
                <Input id="floor_count" name="floor_count" type="number" min={1} defaultValue={2} />
              </div>
            </div>
            <input type="hidden" name="status" value="active" />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save property"}
            </Button>
          </form>
        )}

        {step === "rooms" && (
          <form onSubmit={handleRoom} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add at least one room. Beds are created from the bed count. Floors were created with the property.
            </p>
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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bed_capacity">Beds</Label>
                <Input id="bed_capacity" name="bed_capacity" type="number" min={1} defaultValue={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_rent">Monthly rent (₹)</Label>
                <Input id="monthly_rent" name="monthly_rent" type="number" min={0} required />
              </div>
            </div>
            <input type="hidden" name="gender_restriction" value="none" />
            <Button type="submit" disabled={loading || !propertyId} className="w-full">
              {loading ? "Adding room..." : "Add room and continue"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("finish")}>
              Skip for now
            </Button>
          </form>
        )}

        {step === "finish" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your workspace is ready. Next you can add or import residents from the dashboard.
            </p>
            <Button
              type="button"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                const result = await completeOnboarding();
                if (result && "error" in result && result.error) {
                  setError(result.error);
                  setLoading(false);
                }
              }}
            >
              Go to dashboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
