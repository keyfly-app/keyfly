import type { StaticImageData } from "next/image";
import keyHandover from "../../brand/campaign/both-key-handover-3x2-a.jpg";
import landlordDoorway from "../../brand/campaign/landlord-doorway-16x9-a.jpg";
import firstEvening from "../../brand/campaign/tenant-first-evening-4x5-b.jpg";
import moveInCouple from "../../brand/campaign/tenant-move-in-couple-3x2-a.jpg";

/**
 * Campaign photos used on the website. All are AI-generated (see brand/campaign/README.md),
 * so every placement shows the AiImageBadge. `focus` keeps the people in frame when the image is cropped.
 */
export const PHOTOS = {
  moveIn: { src: moveInCouple, focus: "object-[70%_50%] max-sm:object-[74%_50%]" },
  firstEvening: { src: firstEvening, focus: "object-[50%_42%]" },
  landlord: { src: landlordDoorway, focus: "object-[72%_28%]" },
  keyHandover: { src: keyHandover, focus: "object-[62%_40%]" },
} satisfies Record<string, { src: StaticImageData; focus: string }>;
