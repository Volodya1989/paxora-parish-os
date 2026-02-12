import { prisma } from "@/server/db/prisma";
import type { DeliveryChannel } from "@prisma/client";

type ListFailedDeliveryAttemptsInput = {
  parishId: string;
  sinceHours: number;
  channel?: DeliveryChannel | "ALL";
};

export async function listFailedDeliveryAttempts(input: ListFailedDeliveryAttemptsInput) {
  const since = new Date(Date.now() - input.sinceHours * 60 * 60 * 1000);

  return prisma.deliveryAttempt.findMany({
    where: {
      parishId: input.parishId,
      status: "FAILURE",
      createdAt: {
        gte: since
      },
      channel: input.channel && input.channel !== "ALL" ? input.channel : undefined
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100,
    select: {
      id: true,
      channel: true,
      target: true,
      template: true,
      errorCode: true,
      errorMessage: true,
      context: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}
