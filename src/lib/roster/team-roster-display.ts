import {
  TeamPlayerPlacementStatus,
  TeamPlayerPlacementType,
} from "@prisma/client";

const STATUS_LABEL: Record<TeamPlayerPlacementStatus, string> = {
  [TeamPlayerPlacementStatus.INVITED]: "Invited",
  [TeamPlayerPlacementStatus.OFFERED]: "Offered",
  [TeamPlayerPlacementStatus.COMMITTED]: "Committed",
  [TeamPlayerPlacementStatus.NOT_INTERESTED]: "Not interested",
  [TeamPlayerPlacementStatus.SECONDARY_REQUESTED]: "Secondary (pending director)",
  [TeamPlayerPlacementStatus.SECONDARY_APPROVED]: "Secondary approved",
  [TeamPlayerPlacementStatus.SECONDARY_DENIED]: "Secondary denied",
  [TeamPlayerPlacementStatus.GUEST_REQUESTED]: "Guest (pending HC)",
  [TeamPlayerPlacementStatus.GUEST_APPROVED]: "Guest approved",
  [TeamPlayerPlacementStatus.GUEST_DENIED]: "Guest denied",
};

const TYPE_LABEL: Record<TeamPlayerPlacementType, string> = {
  [TeamPlayerPlacementType.PRIMARY]: "Primary",
  [TeamPlayerPlacementType.SECONDARY]: "Secondary",
  [TeamPlayerPlacementType.GUEST]: "Guest",
};

export function formatPlacementStatusLabel(status: TeamPlayerPlacementStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function formatPlacementTypeLabel(t: TeamPlayerPlacementType): string {
  return TYPE_LABEL[t] ?? t;
}
