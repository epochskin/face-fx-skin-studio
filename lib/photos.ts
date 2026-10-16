// Every photo slot on the site, in one place.
//
// Slots with src: null show a themed placeholder. To use a real photo, put the file in
// public/images/ and set src (for example "/images/room.jpg"), then set width and height
// to the file's real pixel size so the layout does not jump. Use the studio's original
// files, not Instagram screenshots: aim for at least 1600 px on the long edge.
export type PhotoSlot = {
  src: string | null;
  alt: string; // describes the real photo; also read aloud for the placeholder
  label: string; // short caption printed on the placeholder
  ratio: string; // CSS aspect-ratio for the placeholder, e.g. "3 / 4"
  width: number;
  height: number;
};

export const PHOTOS = {
  specialist: {
    src: null,
    alt: "Your skin specialist",
    label: "Your specialist",
    ratio: "3 / 4",
    width: 1200,
    height: 1600,
  },
  room: {
    src: null,
    alt: "The private treatment room",
    label: "The treatment room",
    ratio: "4 / 3",
    width: 1600,
    height: 1200,
  },
  lounge: {
    src: null,
    alt: "The Reset Lounge",
    label: "The Reset Lounge",
    ratio: "4 / 3",
    width: 1600,
    height: 1200,
  },
  entrance: {
    src: null,
    alt: "The studio entrance",
    label: "The studio entrance",
    ratio: "4 / 3",
    width: 1600,
    height: 1200,
  },
} as const satisfies Record<string, PhotoSlot>;

export type PhotoKey = keyof typeof PHOTOS;
