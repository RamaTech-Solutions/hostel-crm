"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function RoomForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("property_id", propertyId);
    const result = await createRoom(formData);
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success("Room created with beds");
    router.refresh();
    setLoading(false);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add Room</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="room_number">Room Number</Label>
            <Input id="room_number" name="room_number" required placeholder="101" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room_type">Room Type</Label>
            <Select name="room_type" defaultValue="double">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="double">Double</SelectItem>
                <SelectItem value="triple">Triple</SelectItem>
                <SelectItem value="dorm">Dorm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bed_capacity">Number of Beds</Label>
            <Input id="bed_capacity" name="bed_capacity" type="number" min={1} max={8} defaultValue={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_rent">Monthly Rent (₹)</Label>
            <Input id="monthly_rent" name="monthly_rent" type="number" min={0} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender_restriction">Gender</Label>
            <Select name="gender_restriction" defaultValue="none">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Restriction</SelectItem>
                <SelectItem value="male">Male Only</SelectItem>
                <SelectItem value="female">Female Only</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
