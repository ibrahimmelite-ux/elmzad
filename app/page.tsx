// app/page.tsx

"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const BRAND_RED = "#C01617";

const categories = [
  "All categories",
  "Mobiles & Tablets",
  "Electronics",
  "Home & Furniture",
  "Cars & Vehicles",
  "Fashion",
  "Real Estate",
];

type MarketplaceListing = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  current_bid: number;
  image_url: string | null;
  ends_at: string;
};

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string>("All categories");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load listings from Supabase
  useEffect(() => {
    async function loadListings() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setListings([]);
      } else {
        setListings((data || []) as MarketplaceListing[]);
      }

      setLoading(false);
    }

    loadListings();
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredListings = listings.filter((item) => {
    const categoryMatch =
      activeCategory === "All categories" ||
      (item.category || "").trim() === activeCategory;

    const haystack =
      (
        (item.title || "") +
        " " +
        (item.description || "") +
        " " +
        (item.location || "") +
        " " +
        (item.category || "")
      ).toLowerCase();

    const searchMatch =
      normalizedQuery === "" || haystack.includes(normalizedQuery);

    return categoryMatch && searchMatch;
  });

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          {/* Logo */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center">
              <Image
                src="/elmzad-logo.png"
                alt="Elmzad auction logo"
                width={260}
                height={90}
                priority
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-1 items-center">
            <div className="flex w-full items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm">
              <input
                type="text"
                placeholder="Search items, brands, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              />
              <button
                className="rounded-full px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
                style={{ backgroundColor: BRAND_RED }}
              >
                Search
              </button>
            </div>
          </div>

          {/* Auth + Sell */}
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/auth/signin"
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
            >
              Sign in
            </Link>

            <Link
              href="/auth/signup"
              className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Sign up
            </Link>

            <Link
              href="/sell"
              className="rounded-full px-3 py-1.5 text-xs font-medium hover:bg-red-50"
              style={{
                border: `1px solid ${BRAND_RED}`,
                color: BRAND_RED,
              }}
            >
              Sell
            </Link>
          </div>
        </div>
      </header>

      {/* CATEGORY TABS */}
      <section className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-4 py-2 text-xs sm:text-sm">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="whitespace-nowrap rounded-full px-3 py-1 transition"
                style={
                  isActive
                    ? { backgroundColor: BRAND_RED, color: "#FFFFFF" }
                    : {
                        backgroundColor: "#F3F4F6",
                        color: "#374151",
                      }
                }
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* FEATURED AUCTIONS */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Featured auctions</h2>
          <button
            className="text-xs font-medium hover:underline"
            style={{ color: BRAND_RED }}
          >
            View all
          </button>
        </div>

        {/* Loading / error states */}
        {loading && (
          <p className="text-sm text-neutral-500">Loading listings...</p>
        )}

        {error && !loading && (
          <p className="text-sm text-red-600">
            Could not load listings: {error}
          </p>
        )}

        {!loading && !error && filteredListings.length === 0 && (
          <p className="text-sm text-neutral-500">
            No items match your search in this category.
          </p>
        )}

        {!loading && !error && filteredListings.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filteredListings.map((item) => (
              <Link
                key={item.id}
                href={`/listing/${item.id}`}
                className="group rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Image – use plain <img> for remote URLs */}
                {item.image_url ? (
                  <div className="relative mb-3 h-40 w-full overflow-hidden rounded-md bg-neutral-100">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-3 flex h-40 w-full items-center justify-center rounded-md bg-neutral-100 text-[11px] text-neutral-400">
                    No image
                  </div>
                )}

                {/* Category pill */}
                <span className="mb-1 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                  {item.category || "Other"}
                </span>

                {/* Title */}
                <h3 className="mt-1 line-clamp-2 text-sm font-medium group-hover:underline">
                  {item.title}
                </h3>

                {/* Price & location */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-900">
                    {Number(item.current_bid || 0).toLocaleString()} AED
                  </span>
                  <span className="text-neutral-500">
                    {item.location || "UAE"}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-neutral-500">
                  Auction · Click to see bids & timer
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* HOW BIDDING WORKS */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-2">
        <h2 className="mb-3 text-lg font-semibold">How bidding works</h2>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p
              className="text-[11px] font-semibold"
              style={{ color: BRAND_RED }}
            >
              Step 1
            </p>
            <h3 className="mb-1 text-sm font-semibold">Find your item</h3>
            <p className="text-neutral-600">
              Use search and filters to locate the exact model, size, or
              category you want.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p
              className="text-[11px] font-semibold"
              style={{ color: BRAND_RED }}
            >
              Step 2
            </p>
            <h3 className="mb-1 text-sm font-semibold">Check the current bid</h3>
            <p className="text-neutral-600">
              Review the current highest bid, minimum increment, and remaining
              time before you place your offer.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p
              className="text-[11px] font-semibold"
              style={{ color: BRAND_RED }}
            >
              Step 3
            </p>
            <h3 className="mb-1 text-sm font-semibold">Bid & win safely</h3>
            <p className="text-neutral-600">
              If you're the top bidder when the auction ends, you win and
              complete payment securely through Elmzad.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
