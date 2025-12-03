// app/sell/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

const BRAND_RED = "#C01617";

export default function SellPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState("Used - Very good");

  const [startingPrice, setStartingPrice] = useState("");
  const [minIncrement, setMinIncrement] = useState("10");
  const [buyNowPrice, setBuyNowPrice] = useState("");

  const [durationHours, setDurationHours] = useState("24");
  const [imageUrl, setImageUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check logged-in user
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setLoadingUser(false);
    }
    loadUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!user) {
      setError("You must be signed in to create a listing.");
      return;
    }

    if (!title || !startingPrice || !minIncrement || !durationHours) {
      setError("Please fill all required fields.");
      return;
    }

    const startPriceNum = Number(startingPrice);
    const minIncNum = Number(minIncrement);
    const durationNum = Number(durationHours);
    const buyNowNum =
      buyNowPrice.trim() !== "" ? Number(buyNowPrice) : null;

    if (Number.isNaN(startPriceNum) || startPriceNum <= 0) {
      setError("Starting price must be a positive number.");
      return;
    }
    if (Number.isNaN(minIncNum) || minIncNum <= 0) {
      setError("Minimum increment must be a positive number.");
      return;
    }
    if (buyNowNum !== null && (Number.isNaN(buyNowNum) || buyNowNum <= 0)) {
      setError("Buy Now price must be a positive number.");
      return;
    }
    if (Number.isNaN(durationNum) || durationNum <= 0) {
      setError("Duration must be a positive number.");
      return;
    }

    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + durationNum);

    setIsSaving(true);

    const { data, error: insertError } = await supabase
      .from("marketplace_listings")
      .insert({
        seller_id: user.id,
        title,
        description: description || null,
        category: category || null,
        location: location || null,
        starting_price: startPriceNum,
        current_bid: startPriceNum,
        min_increment: minIncNum,
        buy_now_price: buyNowNum,
        image_url: imageUrl || null,
        ends_at: endsAt.toISOString(),
      })
      .select("id")
      .single();

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Listing created successfully.");

      setTitle("");
      setDescription("");
      setCategory("");
      setLocation("");
      setStartingPrice("");
      setMinIncrement("10");
      setBuyNowPrice("");
      setDurationHours("24");
      setImageUrl("");

      if (data?.id) {
        setTimeout(() => router.push(`/listing/${data.id}`), 1000);
      }
    }
  };

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-sm text-neutral-600">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm text-sm">
          <h1 className="mb-3 text-lg font-semibold text-neutral-900">
            You need an account
          </h1>
          <p className="mb-3 text-neutral-700">
            Please sign in or sign up before creating a listing.
          </p>
          <div className="flex gap-2">
            <Link
              href="/auth/signin"
              className="flex-1 rounded-full border border-neutral-300 px-3 py-2 text-center text-xs font-medium text-neutral-800 hover:bg-neutral-100"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="flex-1 rounded-full bg-red-600 px-3 py-2 text-center text-xs font-medium text-white hover:bg-red-700"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-neutral-900">
          List an item for auction
        </h1>
        <p className="mb-4 text-sm text-neutral-600">
          Fill in the details below. Buyers will see this information exactly as you type it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">
              Title *
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: iPhone 14 Pro 256 GB"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">
              Description
            </label>
            <textarea
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Condition, accessories, warranty, etc."
            />
          </div>

          {/* Category & location */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Category
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Phones, Electronics, Furniture..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Location
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Dubai, UAE"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Starting price */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Starting price (AED) *
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
              />
            </div>

            {/* Min increment */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Min increment (AED) *
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
                value={minIncrement}
                onChange={(e) => setMinIncrement(e.target.value)}
              />
            </div>

            {/* Buy now price */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Buy now price (AED)
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
                value={buyNowPrice}
                onChange={(e) => setBuyNowPrice(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Duration & Image */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Auction duration (hours) *
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Image URL
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste a link for now"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Later we will move to real file uploads.
              </p>
            </div>
          </div>

          {/* Error / success */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="mt-2 w-full rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-neutral-300"
          >
            {isSaving ? "Creating listing..." : "Create listing"}
          </button>
        </form>
      </div>
    </main>
  );
}
