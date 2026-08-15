"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createFloor,
  updateFloorLabel,
  deleteFloor,
  deleteRoom,
  setBedAvailability,
} from "@/lib/actions";
import { RoomForm } from "@/features/properties/room-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedStatusBadge } from "@/components/ui/status-badge";
import { classifyBed } from "@/lib/inventory/occupancy";
import { toast } from "sonner";
import Link from "next/link";
import type { BedStatus } from "@/types/database";
import type { RoomWithBeds } from "@/lib/queries";
import type { Floor } from "@/types/database";

export function InventoryPanel({
  propertyId,
  floors,
  rooms,
  canWriteRooms,
  canManageFloors,
}: {
  propertyId: string;
  floors: Floor[];
  rooms: RoomWithBeds[];
  canWriteRooms: boolean;
  canManageFloors: boolean;
}) {
  const router = useRouter();
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [floorLabelEdits, setFloorLabelEdits] = useState<Record<string, string>>({});

  async function addFloor() {
    const formData = new FormData();
    formData.set("property_id", propertyId);
    const result = await createFloor(formData);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Floor added");
      router.refresh();
    }
  }

  async function renameFloor(floorId: string) {
    const label = floorLabelEdits[floorId]?.trim();
    if (!label) return;
    const result = await updateFloorLabel(floorId, label, propertyId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Floor renamed");
      router.refresh();
    }
  }

  async function removeFloor(floorId: string) {
    if (!window.confirm("Remove this empty floor?")) return;
    const result = await deleteFloor(floorId, propertyId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Floor removed");
      router.refresh();
    }
  }

  async function removeRoom(roomId: string) {
    if (!window.confirm("Delete this room? This is only allowed when it has no resident history.")) return;
    const result = await deleteRoom(roomId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Room deleted");
      router.refresh();
    }
  }

  async function toggleBed(bedId: string, next: "available" | "maintenance") {
    const result = await setBedAvailability(bedId, next);
    if (result.error) toast.error(result.error);
    else router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        {canManageFloors ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Floors</CardTitle>
              <Button size="sm" type="button" onClick={addFloor}>Add floor</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {floors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No floors yet. Add a floor before creating rooms.</p>
              ) : (
                floors.map((floor) => {
                  const roomCount = rooms.filter((room) => room.floor_id === floor.id).length;
                  return (
                    <div key={floor.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                      <Input
                        defaultValue={floor.label}
                        onChange={(event) =>
                          setFloorLabelEdits((current) => ({ ...current, [floor.id]: event.target.value }))
                        }
                        className="max-w-xs"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={() => renameFloor(floor.id)}>
                        Rename
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={roomCount > 0}
                        onClick={() => removeFloor(floor.id)}
                      >
                        Remove
                      </Button>
                      {roomCount > 0 ? (
                        <span className="text-xs text-muted-foreground">{roomCount} rooms</span>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : null}

        {rooms.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No rooms yet. Add a room so you can assign beds.
            </CardContent>
          </Card>
        ) : (
          rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                  <span>Room {room.room_number}</span>
                  <span className="text-sm font-normal text-muted-foreground">₹{room.monthly_rent}/mo</span>
                </CardTitle>
                {canWriteRooms ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingRoomId(room.id)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeRoom(room.id)}>
                      Delete
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {editingRoomId === room.id ? (
                  <RoomForm
                    propertyId={propertyId}
                    floors={floors}
                    room={{
                      id: room.id,
                      room_number: room.room_number,
                      room_type: room.room_type,
                      bed_capacity: room.bed_capacity,
                      monthly_rent: Number(room.monthly_rent),
                      gender_restriction: room.gender_restriction,
                      floor_id: room.floor_id,
                    }}
                    onDone={() => setEditingRoomId(null)}
                  />
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {(room.beds ?? []).map((bed) => {
                    const resident = bed.assignment?.resident;
                    const category = classifyBed({
                      status: bed.status,
                      hasActiveAssignment: Boolean(bed.assignment),
                    });
                    return (
                      <div
                        key={bed.id}
                        className={`rounded-lg border p-3 ${
                          category === "occupied" ? "border-success/30 bg-success/10" :
                          category === "vacant" ? "border-primary/30 bg-primary/10" :
                          "border-border bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Bed {bed.bed_label}</span>
                          <BedStatusBadge status={bed.status as BedStatus} />
                        </div>
                        {resident ? (
                          <Link href={`/residents/${resident.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                            {resident.full_name}
                          </Link>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {category === "unavailable" ? "Unavailable" : "Vacant"}
                          </p>
                        )}
                        {canWriteRooms && !bed.assignment ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="mt-2 h-7 px-2"
                            onClick={() => toggleBed(bed.id, category === "unavailable" ? "available" : "maintenance")}
                          >
                            {category === "unavailable" ? "Restore vacant" : "Mark unavailable"}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {canWriteRooms ? (
        <div id="add-room">
          <RoomForm propertyId={propertyId} floors={floors} />
        </div>
      ) : null}
    </div>
  );
}
