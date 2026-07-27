"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser, requireUser } from "@/lib/auth/guards";
import { type ActionResult } from "@/lib/action-result";
import {
  createVehicle,
  deleteVehicle,
  getVehicles,
  updateVehicle,
} from "@/lib/db/vehicles";
import {
  toVehiclePlain,
  type VehiclePlain,
} from "@/features/trips/lib/trip-view-model";
import {
  vehicleCreateSchema,
  vehicleUpdateSchema,
} from "@/lib/validators/vehicle";

export async function getMyVehiclesAction() {
  const user = await requireAuthenticatedUser();
  return getVehicles(user.id);
}

export async function createVehicleAction(
  input: unknown,
): Promise<ActionResult<VehiclePlain>> {
  const user = await requireUser();
  const parsed = vehicleCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid vehicle data.",
    };
  }

  const vehicle = await createVehicle(user.id, parsed.data);
  revalidatePath("/profile");
  return { success: true, data: toVehiclePlain(vehicle) };
}

export async function updateVehicleAction(
  vehicleId: string,
  input: unknown,
): Promise<ActionResult<VehiclePlain>> {
  const user = await requireUser();
  const parsed = vehicleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid vehicle data.",
    };
  }

  const vehicle = await updateVehicle(vehicleId, user.id, parsed.data);
  if (!vehicle) {
    return { success: false, error: "Vehicle not found." };
  }

  revalidatePath("/profile");
  return { success: true, data: toVehiclePlain(vehicle) };
}

export async function deleteVehicleAction(
  vehicleId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const deleted = await deleteVehicle(vehicleId, user.id);
  if (!deleted) {
    return { success: false, error: "Vehicle not found." };
  }

  revalidatePath("/profile");
  return { success: true, data: undefined };
}

export async function setDefaultVehicleAction(
  vehicleId: string,
): Promise<ActionResult> {
  return updateVehicleAction(vehicleId, { isDefault: true }).then((result) =>
    result.success ? { success: true, data: undefined } : result,
  );
}
