type AllocationInput = {
  estimatedHours: number;
  volunteersNeeded: number;
  participantCount: number;
};

export function calculateEstimatedHoursPerParticipant({
  estimatedHours,
  volunteersNeeded,
  participantCount
}: AllocationInput) {
  if (participantCount <= 0) {
    throw new Error("At least one participant is required.");
  }

  if (participantCount >= volunteersNeeded) {
    return estimatedHours;
  }

  const missing = volunteersNeeded - participantCount;
  const extraPerPerson = (missing * estimatedHours) / participantCount;
  return estimatedHours + extraPerPerson;
}
