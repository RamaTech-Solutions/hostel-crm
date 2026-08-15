"use client";

import { useEffect, useState } from "react";
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
  currentStay,
}: {
  residentId: string;
  properties: Property[];
  currentPropertyId: string;
  currentStay: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState(currentPropertyId);
  const [roomId, setRoomId] = useState("");
  const [bedId, setBedId] = useState("");
  const [beds, setBeds] = useState<BedOption[]>([]);

  useEffect(() => {
    if (!propertyId) return;
    fetch(`/api/beds/available?propertyId=${propertyId}`)
      .then((response) => response.json())
      .then((data) => setBeds(data.beds ?? []));
  }, [propertyId]);

  const uniqueRooms = [...new Map(beds.map((bed) => [bed.room.id, bed.room])).values()];
  const bedsForRoom = beds.filter((bed) => bed.room.id === roomId);
  const toRoom = uniqueRooms.find((room) => room.id === roomId);
  const toBed = bedsForRoom.find((bed) => bed.id === bedId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("property_id", propertyId);
    formData.set("room_id", roomId);
    formData.set("bed_id", bedId);
    const result = await transferResident(residentId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Resident transferred");
      router.push(`/residents/${residentId}`);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Transfer room / bed</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <p className="text-sm text-muted-foreground">From: {currentStay}</p>
          {toRoom && toBed ? (
            <p className="text-sm">To: Room {toRoom.room_number} · Bed {toBed.bed_label}</p>
          ) : null}
          <div className="space-y-2">
            <Label>Property</Label>
            <Select value={propertyId} onValueChange={(value) => { setPropertyId(value); setRoomId(""); setBedId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {properties.map((property) => <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Room</Label>
            <Select value={roomId || undefined} onValueChange={(value) => { setRoomId(value); setBedId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                {uniqueRooms.map((room) => <SelectItem key={room.id} value={room.id}>Room {room.room_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bed</Label>
            <Select value={bedId || undefined} onValueChange={setBedId}>
              <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
              <SelectContent>
                {bedsForRoom.map((bed) => <SelectItem key={bed.id} value={bed.id}>Bed {bed.bed_label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transfer date</Label>
            <Input name="transfer_date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
          </div>
          <div className="space-y-2"><Label>Reason</Label><Input name="reason" /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
          <Button type="submit" disabled={loading || !bedId}>{loading ? "Transferring..." : "Confirm transfer"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
