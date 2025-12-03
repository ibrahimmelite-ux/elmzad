// app/my-listings/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

const BRAND_RED = "#C01617";

type DbRow = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  starting_price: number | string;
  current_bid: number | string;
  min_increment: number | string;
  image_url: string | null;
  ends_at: string;
  buy_now_price?: number | string | null;
  seller_id?: string | null;
  status?: string | null; // 'active' | 'sold' | null/other
};

function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString();
}

export default function MyListingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [listings, setListings] = useState<DbRow[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relistLoadingId, setRelistLoadingId] = useState<number | null>(null);
  const [relistError, setRelistError] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setLoadingUser(false);
    }
    loadUser();
  }, []);

  // Load listings for this user
  useEffect(() => {
    if (!user) {
      setListings([]);
      setLoadingListings(false);
      return;
    }

    // ✅ Take user as a parameter so TS knows it's not null inside
    async function loadListings(currentUser: User) {
      setLoadingListings(true);
      setError(null);

      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("seller_id", currentUser.id)
        .order("id", { ascending: false });

      if (error) {
        setError(error.message);
        setListings([]);
        setLoadingListings(false);
        return;
      }

      setListings(data ?? []);
      setLoadingListings(false);
    }

    // Call with the actual, non-null user
    loadListings(user);
  }, [user]);

  // Relist handler (default: +72 hours, reset current_bid)
  const handleRelist = async (listing: DbRow) => {
    setRelistError(null);

    if (!user) {
      setRelistError("You must be signed in to relist.");
      return;
    }

    const listingId = listing.id;
    const startingPriceNum = Number(listing.starting_price);
    if (Number.isNaN(startingPriceNum) || startingPriceNum <= 0) {
      setRelistError(
        "Cannot relist because starting price is invalid. Please edit the listing in the database."
      );
      return;
    }

    setRelistLoadingId(listingId);

    // New end date: now + 72 hours (3 days)
    const now = new Date();
    const ends = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const endsAtIso = ends.toISOString();

    const { error } = await supabase
      .from("marketplace_listings")
      .update({
        status: "active",
        current_bid: startingPriceNum,
        ends_at: endsAtIso,
      })
      .eq("id", listingId)
      .eq("seller_id", user.id);

    setRelistLoadingId(null);

    if (error) {
      setRelistError("Failed to relist: " + error.message);
      return;
    }

    // Update state locally so UI reflects changes immediately
    setListings((prev) =>
      prev.map((item) =>
        item.id === listingId
          ? {
              ...item,
              status: "active",
              current_bid: startingPriceNum,
              ends_at: endsAtIso,
            }
          : item
      )
    );
  };

  // 1) Loading global
  if (loadingUser) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-sm text-neutral-600">Loading your account...</p>
      </main>
    );
  }

  // 2) Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm text-sm">
          <h1 className="mb-3 text-lg font-semibold text-neutral-900">
            You need an account
          </h1>
          <p className="mb-3 text-neutral-700">
            Please sign in or sign up to view your listings.
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

  // 3) Main page
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              My listings
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              These are the items you&apos;ve listed for auction on Elmzad.
            </p>
          </div>

          <Link
            href="/sell"
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
          >
            + List a new item
          </Link>
        </div>

        {loadingListings && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            Loading your listings...
          </div>
        )}

        {error && !loadingListings && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load your listings: {error}
          </div>
        )}

        {relistError && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {relistError}
          </div>
        )}

        {!loadingListings && !error && listings.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
            <p className="mb-2 text-neutral-800 font-medium">
              You haven&apos;t listed any items yet.
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              Start by listing your first item. You can always refine the
              experience later — what matters now is getting Elmzad in front of
              real users.
            </p>
            <Link
              href="/sell"
              className="inline-block rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
            >
              List an item now
            </Link>
          </div>
        )}

        {!loadingListings && !error && listings.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => {
              const currentBid = Number(item.current_bid);
              const startingPrice = Number(item.starting_price);
              const buyNow =
                item.buy_now_price !== undefined && item.buy_now_price !== null
                  ? Number(item.buy_now_price)
                  : null;

              const status = item.status ?? "active";
              const endsAtTime = new Date(item.ends_at).getTime();
              const now = Date.now();

              const isSold = status === "sold";
              const isEndedByTime = endsAtTime < now && !isSold;
              const isActive = status === "active" && !isEndedByTime;
              const canRelist = !isSold && isEndedByTime;

              let statusLabel = "Active";
              let statusClass =
                "bg-green-100 text-green-700 border border-green-200";
              if (isSold) {
                statusLabel = "Sold";
                statusClass = "bg-red-100 text-red-700 border border-red-200";
              } else if (isEndedByTime) {
                statusLabel = "Ended";
                statusClass =
                  "bg-neutral-100 text-neutral-700 border border-neutral-200";
              }

              return (
                <div
                  key={item.id}
                  className="group rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm hover:border-red-400 hover:shadow-md transition flex flex-col"
                >
                  {/* Image */}
                  <Link
                    href={`/listing/${item.id}`}
                    className="mb-2 h-40 w-full overflow-hidden rounded-md bg-neutral-100 flex items-center justify-center"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
                      />
                    ) : (
                      <span className="text-[11px] text-neutral-500">
                        No image
                      </span>
                    )}
                  </Link>

                  {/* Title */}
                  <Link
                    href={`/listing/${item.id}`}
                    className="line-clamp-2 text-sm font-semibold text-neutral-900 mb-1 hover:underline"
                  >
                    {item.title}
                  </Link>

                  {/* Category & location */}
                  <p className="text-[11px] text-neutral-500 mb-1">
                    {item.category || "Other"}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>

                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mb-2 ${statusClass}`}
                  >
                    {statusLabel}
                  </span>

                  {/* Prices */}
                  <div className="mb-2 text-xs">
                    <p className="text-neutral-800">
                      Current bid:{" "}
                      <span className="font-semibold">
                        {currentBid.toLocaleString()} AED
                      </span>
                    </p>
                    <p className="text-neutral-500">
                      Starting price: {startingPrice.toLocaleString()} AED
                    </p>
                    {buyNow !== null && (
                      <p className="text-[11px] text-neutral-600">
                        Buy now:{" "}
                        <span className="font-medium">
                          {buyNow.toLocaleString()} AED
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Ends at */}
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Ends: {formatShortDateTime(item.ends_at)}
                  </p>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-neutral-100">
                    <Link
                      href={`/listing/${item.id}`}
                      className="text-[11px] font-medium"
                      style={{ color: BRAND_RED }}
                    >
                      View listing →
                    </Link>

                    {canRelist && (
                      <button
                        type="button"
                        onClick={() => handleRelist(item)}
                        disabled={relistLoadingId === item.id}
                        className="text-[11px] rounded-full border border-neutral-300 px-2.5 py-1 font-medium text-neutral-700 hover:bg-neutral-100 disabled:bg-neutral-100 disabled:text-neutral-400"
                      >
                        {relistLoadingId === item.id
                          ? "Relisting..."
                          : "Relist (3 days)"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
