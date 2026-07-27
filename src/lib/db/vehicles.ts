import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type VehicleCreateData = {
  name: string;
  type?: string | null;
  fuelType: string;
  licensePlate?: string | null;
  fuelConsumptionLPer100km: number;
  tankCapacityL: number;
  isDefault?: boolean;
};

export type VehicleUpdateData = Partial<VehicleCreateData>;

export async function getVehicles(userId: string) {
  return prisma.vehicle.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getVehicleById(vehicleId: string, userId: string) {
  return prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
  });
}

export async function createVehicle(userId: string, data: VehicleCreateData) {
  return prisma.$transaction(async (tx) => {
    const shouldBeDefault =
      data.isDefault ?? (await tx.vehicle.count({ where: { userId } })) === 0;

    if (shouldBeDefault) {
      await tx.vehicle.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return tx.vehicle.create({
      data: {
        userId,
        name: data.name.trim() || "New vehicle",
        type: data.type || null,
        fuelType: data.fuelType,
        licensePlate: data.licensePlate?.trim() || null,
        fuelConsumptionLPer100km: new Prisma.Decimal(
          data.fuelConsumptionLPer100km,
        ),
        tankCapacityL: new Prisma.Decimal(data.tankCapacityL),
        isDefault: shouldBeDefault,
      },
    });
  });
}

export async function updateVehicle(
  vehicleId: string,
  userId: string,
  data: VehicleUpdateData,
) {
  const current = await getVehicleById(vehicleId, userId);
  if (!current) return null;

  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.vehicle.updateMany({
        where: { userId, id: { not: vehicleId } },
        data: { isDefault: false },
      });
    }

    return tx.vehicle.update({
      where: { id: vehicleId },
      data: {
        name: data.name?.trim(),
        type: data.type === undefined ? undefined : data.type || null,
        fuelType: data.fuelType,
        licensePlate:
          data.licensePlate === undefined
            ? undefined
            : data.licensePlate?.trim() || null,
        fuelConsumptionLPer100km:
          data.fuelConsumptionLPer100km === undefined
            ? undefined
            : new Prisma.Decimal(data.fuelConsumptionLPer100km),
        tankCapacityL:
          data.tankCapacityL === undefined
            ? undefined
            : new Prisma.Decimal(data.tankCapacityL),
        isDefault: data.isDefault,
      },
    });
  });
}

export async function deleteVehicle(vehicleId: string, userId: string) {
  const vehicle = await getVehicleById(vehicleId, userId);
  if (!vehicle) return false;

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.delete({
      where: { id: vehicleId },
    });

    if (vehicle.isDefault) {
      const nextDefault = await tx.vehicle.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });

      if (nextDefault) {
        await tx.vehicle.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return true;
}
