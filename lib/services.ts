// Real services, prices and durations from the studio's Square booking site.
export type Category = "facials" | "hair-removal" | "parties";

export type Service = {
  slug: string;
  name: string;
  category: Category;
  price: number;
  duration: string;
  summary: string; // short, for cards
  description: string; // full, for the detail page
  includes?: string[];
  note?: string;
};

export const CATEGORIES: { id: Category; title: string; blurb: string }[] = [
  { id: "facials", title: "Facials", blurb: "Corrective and HydraFacial treatments for visible results." },
  { id: "hair-removal", title: "Sugaring & waxing", blurb: "Crème wax and organic sugar for smooth skin." },
  { id: "parties", title: "Spa parties", blurb: "Treat your favorite people." },
];

export const SERVICES: Service[] = [
  {
    slug: "fall-reset-facial",
    name: "Fall Reset Facial",
    category: "facials",
    price: 115,
    duration: "50 min",
    summary: "A custom facial built around your skin, with exfoliation, extractions and a hand and arm massage.",
    description:
      "A custom treatment catered to your specific needs. Every Fall Reset includes a few levels of exfoliation, followed by an intense extraction (if needed) and a nutrient-dense formula blended after your skin analysis. Professional-only product lines are used throughout, and the treatment includes a hand and arm massage. Think luxurious ingredients, visible results and advanced skincare technology.",
    includes: [
      "Skin analysis",
      "Several levels of exfoliation",
      "Intense extraction, if needed",
      "A nutrient-dense formula made for your skin",
      "Hand and arm massage",
    ],
    note: "A 50% deposit is collected when you book.",
  },
  {
    slug: "hydrafacial-classic",
    name: "HydraFacial Classic",
    category: "facials",
    price: 195,
    duration: "1 hr",
    summary: "The complete HydraFacial system with a 7.5% peel, masque, peptide moisturizer and mineral SPF 50.",
    description:
      "The complete HydraFacial experience: a deep cleanse, the full HydraFacial system, a 7.5% peel and a masque, finished with a peptide-dense moisturizer and mineral SPF 50. Extractions are included.",
    includes: [
      "Deep cleanse",
      "Complete HydraFacial system",
      "7.5% peel",
      "Masque",
      "Peptide-dense moisturizer",
      "Mineral SPF 50",
      "Extractions",
    ],
  },
  {
    slug: "paramedical-microneedle-facial",
    name: "Paramedical Microneedle Facial",
    category: "facials",
    price: 250,
    duration: "55 min",
    summary: "Paramedical-grade microneedling, tailored to your skin goals.",
    description:
      "A paramedical microneedling facial, tailored to your skin goals. Message the studio with any questions before you book.",
  },
  {
    slug: "hydrafacial-platinum",
    name: "HydraFacial Platinum",
    category: "facials",
    price: 390,
    duration: "1 hr 30 min",
    summary: "HydraFacial with lymphatic drainage massage and a targeted booster.",
    description:
      "The Platinum HydraFacial includes a lymphatic drainage massage to balance the face, plus one targeted booster: Britenol for pigment correction, or the JLO Beauty booster for prevention.",
    includes: [
      "HydraFacial treatment",
      "Lymphatic drainage massage",
      "One targeted booster: Britenol (pigment correction) or JLO Beauty (prevention)",
    ],
  },
  {
    slug: "brazilian-wax",
    name: "Brazilian Wax",
    category: "hair-removal",
    price: 50,
    duration: "45 min",
    summary: "Hot crème wax with fabric strips. Includes stomach area and butt.",
    description:
      "Hair removal using hot crème wax. No hard wax here: crème wax is closer to a soft wax, and fabric strips help remove the hair. Includes the stomach area and butt.",
    includes: ["Hot crème wax", "Fabric strips", "Stomach area and butt included"],
  },
  {
    slug: "brazilian-sugar",
    name: "Brazilian Sugar",
    category: "hair-removal",
    price: 70,
    duration: "30 min",
    summary: "Organic sugaring, a natural, safe and vegan way to remove hair.",
    description:
      "Sugaring is an ancient technique that removes body hair with organic sugar. It is the best option for natural hair removal, and it is safe and vegan.",
    includes: ["Organic sugar", "Safe and vegan"],
  },
  {
    slug: "brazilian-wax-hydra-vajacial",
    name: "Brazilian Wax + Hydra Vajacial",
    category: "hair-removal",
    price: 130,
    duration: "1 hr",
    summary: "A Brazilian wax paired with a Vajacial using the HydraFacial system.",
    description:
      "A Brazilian wax paired with a Vajacial using the HydraFacial system. Includes steam, extraction and a soothing phyto masque. Guaranteed results.",
    includes: ["Brazilian wax", "Vajacial with the HydraFacial system", "Steam and extraction", "Soothing phyto masque"],
  },
  {
    slug: "spa-party",
    name: "Spa Party",
    category: "parties",
    price: 1000,
    duration: "6 hr",
    summary: "For parties of 3–5 or more. Bridal parties, birthdays and girls' days.",
    description:
      "A spa day for parties of at least 3–5 guests, perfect for bridal parties and birthdays. Includes a HydraFacial Express, an optional sauna, V-Steam and an ionic foot detox, with champagne, organic fresh juice, a private aromatherapy relaxation room and a light charcuterie.",
    includes: [
      "HydraFacial Express",
      "Sauna (optional)",
      "V-Steam and ionic foot detox",
      "Champagne and organic fresh juice",
      "Private aromatherapy relaxation room",
      "Light charcuterie",
    ],
  },
];

export const bySlug = (slug: string) => SERVICES.find((s) => s.slug === slug);
export const inCategory = (c: Category) => SERVICES.filter((s) => s.category === c);
export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

// The Square online-booking menu, copied word for word (order, names, descriptions, durations).
// The /book menu renders this so the standalone flow matches the Square site exactly.
// Prices and durations that drive checkout still come from SERVICES above.
export const SQUARE_MENU: { slug: string; description: string }[] = [
  { slug: "paramedical-microneedle-facial", description: "" },
  {
    slug: "fall-reset-facial",
    description:
      "Custom treatment catered to your specific needs. Includes a few levels of exfoliation followed by an intense extraction process (if needed), then a nutrient-dense formula based on your skin analysis, using trusted professional-only lines. Includes hand and arm massage. Luxurious ingredients, visible results & advanced skincare technology.",
  },
  {
    slug: "brazilian-sugar",
    description: "Sugaring is an ancient technique used to remove body hair with organic sugar. Best option for natural hair removal. Safe and vegan.",
  },
  {
    slug: "brazilian-wax",
    description:
      "Hair removal using hot wax crème wax (not hard wax) — closer to a soft wax, with fabric strips used to aid removal. Includes stomach area & butt.",
  },
  {
    slug: "brazilian-wax-hydra-vajacial",
    description:
      "Brazilian Wax + Vajacial using the HydraFacial system. Includes steam, extraction & soothing phyto masque. Guaranteed results.",
  },
  {
    slug: "spa-party",
    description:
      "For a party of at least 3–5 guests. Includes HydraFacial express, sauna (optional), V-Steam & ionic foot detox. Perfect for bridal parties & birthdays — includes champagne, organic fresh juice, a private aromatherapy relaxation room & a light charcuterie.",
  },
  {
    slug: "hydrafacial-platinum",
    description:
      "Includes a lymphatic drainage massage to balance the face, plus 1 targeted booster (Britenol for pigment correction / JLo Beauty booster for prevention).",
  },
  {
    slug: "hydrafacial-classic",
    description: "Includes a deep cleanse, complete HydraFacial system, 7.5% peel, masque, peptide-dense moisturizer & mineral SPF 50. Extractions included.",
  },
];
