"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, updateRoom } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type FloorOption = { id: string; label: string; floor_number: number };

type RoomValues = {
  id: string;
  room_number: string;
  room_type: string;
  bed_capacity: number;
  monthly_rent: number;
  gender_restriction: string;
  floor_id: string | null;
};

export function RoomForm({
  propertyId,
  floors,
  room,
  onDone,
}: {
  propertyId: string;
  floors: FloorOption[];
  room?: RoomValues;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(room);

  const [floorId, setFloorId] = useState(room?.floor_id ?? floors[0]?.id ?? "");
  const [roomType, setRoomType] = useState(room?.room_type ?? "double");
  const [gender, setGender] = useState(room?.gender_restriction ?? "none");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("property_id", propertyId);
    formData.set("floor_id", floorId);
    formData.set("room_type", roomType);
    formData.set("gender_restriction", gender);
    const result = isEdit && room
      ? await updateRoom(room.id, formData)
      : await createRoom(formData);
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success(isEdit ? "Room updated" : "Room created with beds");
    router.refresh();
    setLoading(false);
    if (!isEdit) (e.target as HTMLFormElement).reset();
    onDone?.();
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{isEdit ? `Edit Room ${room?.room_number}` : "Add Room"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="floor_id">Floor</Label>
            <Select value={floorId} onValueChange={setFloorId} required={floors.length > 0}>
              <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
              <SelectContent>
                {floors.map((floor) => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room_number">Room Number</Label>
            <Input id="room_number" name="room_number" required placeholder="101" defaultValue={room?.room_number} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room_type">Room Type</Label>
            <Select value={roomType} onValueChange={setRoomType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="double">Double</SelectItem>
                <SelectItem value="triple">Triple</SelectItem>
                <SelectItem value="dorm">Dorm</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bed_capacity">Number of Beds</Label>
            <Input id="bed_capacity" name="bed_capacity" type="number" min={1} max={20} defaultValue={room?.bed_capacity ?? 2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_rent">Monthly Rent (₹)</Label>
            <Input id="monthly_rent" name="monthly_rent" type="number" min={0} required defaultValue={room?.monthly_rent} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender_restriction">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
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
            {loading ? "Saving..." : isEdit ? "Save room" : "Add Room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
