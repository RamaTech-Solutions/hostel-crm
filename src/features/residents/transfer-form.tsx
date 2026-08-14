"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { transferResident } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Property } from "@/types/database";

interface BedOption {
  id: string;
  bed_label: string;
  room: { id: string; room_number: string };
}

export function TransferForm({
  residentId,
  properties,
  currentPropertyId,
}: {
  residentId: string;
  properties: Property[];
  currentPropertyId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState(currentPropertyId);
  const [roomId, setRoomId] = useState("");
  const [beds, setBeds] = useState<BedOption[]>([]);

  useEffect(() => {
    if (propertyId) {
      fetch(`/api/beds/available?propertyId=${propertyId}`)
        .then((r) => r.json())
        .then((d) => setBeds(d.beds ?? []));
    }
  }, [propertyId]);

  const uniqueRooms = [...new Map(beds.map((b) => [b.room.id, b.room])).values()];
  const bedsForRoom = beds.filter((b) => b.room.id === roomId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("property_id", propertyId);
    formData.set("room_id", roomId);
    const result = await transferResident(residentId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Resident transferred successfully");
      router.push(`/residents/${residentId}`);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Move Resident</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Property</Label>
            <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); setRoomId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                {uniqueRooms.map((r) => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bed</Label>
            <Select name="bed_id" required>
              <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
              <SelectContent>
                {bedsForRoom.map((b) => <SelectItem key={b.id} value={b.id}>Bed {b.bed_label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transfer Date</Label>
            <Input name="transfer_date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input name="reason" placeholder="Room upgrade, maintenance, etc." />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea name="notes" />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Transferring..." : "Confirm Transfer"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
