export type MessageReadIndicatorState = "unread" | "some_read" | "all_read";

export type MessageReadProgress = {
  state: MessageReadIndicatorState;
  readersCount: number;
  recipientCount: number;
};

function lowerBound(values: number[], target: number): number {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export function getMessageReadProgress(
  messageCreatedAt: Date | number,
  sortedRecipientReadAtMs: number[],
  recipientCount = sortedRecipientReadAtMs.length
): MessageReadProgress {
  if (recipientCount <= 0) {
    return {
      state: "unread",
      readersCount: 0,
      recipientCount: 0
    };
  }

  const messageTs =
    typeof messageCreatedAt === "number"
      ? messageCreatedAt
      : messageCreatedAt.getTime();

  const firstReaderIndex = lowerBound(sortedRecipientReadAtMs, messageTs);
  const readersCount = Math.max(0, sortedRecipientReadAtMs.length - firstReaderIndex);

  if (readersCount <= 0) {
    return {
      state: "unread",
      readersCount: 0,
      recipientCount
    };
  }

  if (readersCount >= recipientCount) {
    return {
      state: "all_read",
      readersCount: recipientCount,
      recipientCount
    };
  }

  return {
    state: "some_read",
    readersCount,
    recipientCount
  };
}
