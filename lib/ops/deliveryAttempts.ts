import { prisma } from "@/server/db/prisma";
import type { DeliveryChannel, DeliveryStatus, Prisma } from "@prisma/client";

type RecordDeliveryAttemptInput = {
  channel: DeliveryChannel;
  status: DeliveryStatus;
  parishId?: string | null;
  userId?: string | null;
  target?: string | null;
  template?: string | null;
  context?: Prisma.InputJsonValue;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function maskPushEndpoint(endpoint: string) {
  if (!endpoint) return endpoint;
  return endpoint.length <= 12 ? endpoint : `…${endpoint.slice(-12)}`;
}

export function toDeliveryTarget(channel: DeliveryChannel, target: string) {
  if (channel === "PUSH") {
    return maskPushEndpoint(target);
  }

  return target;
}

export async function recordDeliveryAttempt(input: RecordDeliveryAttemptInput) {
  await prisma.deliveryAttempt.create({
    data: {
      channel: input.channel,
      status: input.status,
      parishId: input.parishId ?? null,
      userId: input.userId ?? null,
      target: input.target ?? null,
      template: input.template ?? null,
      context: input.context ?? undefined,
      providerMessageId: input.providerMessageId ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null
    }
  });
}
