// lib/listings.ts

export type Listing = {
  id: number;
  title: string;
  description: string;
  location: string;
  condition: "New" | "Used";
  currentBid: number;
  bidCount: number;
  minIncrement: number;
  buyNowPrice?: number;
  endTime: string; // ISO string
  thumbnailLabel?: string;
  category: string; // for filtering
};

export const LISTINGS: Listing[] = [
  {
    id: 1,
    title: "iPhone 14 Pro 256 GB – Deep Purple",
    description:
      "Gently used for 8 months, original box and charger included. No major scratches, battery health 93%.",
    location: "Dubai, UAE",
    condition: "Used",
    currentBid: 2850,
    bidCount: 7,
    minIncrement: 50,
    buyNowPrice: 3550,
    endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
    thumbnailLabel: "Ending soon",
    category: "Mobiles & Tablets",
  },
  {
    id: 2,
    title: "3-Seater Fabric Sofa – Light Grey",
    description:
      "Comfortable 3-seater sofa, smoke-free home. Minor wear on armrest, no stains.",
    location: "Abu Dhabi, UAE",
    condition: "Used",
    currentBid: 420,
    bidCount: 3,
    minIncrement: 20,
    buyNowPrice: 650,
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    thumbnailLabel: "Great condition",
    category: "Home & Furniture",
  },
  {
    id: 3,
    title: "PlayStation 5 Digital Edition",
    description:
      "PS5 Digital Edition, one controller, HDMI and power cable included. Lightly used.",
    location: "Sharjah, UAE",
    condition: "Used",
    currentBid: 1350,
    bidCount: 5,
    minIncrement: 50,
    buyNowPrice: 1800,
    endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
    thumbnailLabel: "Hot auction",
    category: "Electronics",
  },
];

export function getListingById(id: number): Listing | undefined {
  return LISTINGS.find((l) => l.id === id);
}
