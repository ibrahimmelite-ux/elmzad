// app/my-bids/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

const BRAND_RED = "#C01617";

type BidRow = {
  id: number;
  amount: number;
  created_at: string;
  listing: {
    id: number;
    title: string;
    image_url: string | null;
    current_bid: number | string;
    starting_price: number | string;
    ends_at: string;
    status?: string | null;
    buyer_id?: string | null;
  } | null;
};

function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString();
}

export default function MyBidsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [bids, setBids] = useState<BidRow[]>([]);
  const [loadingBids, setLoadingBids] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setLoadingUser(false);
    }
    loadUser();
  }, []);

  // Load bids for this user
  useEffect(() => {
    // If no user, clear bids and stop
    if (!user) {
      setBids([]);
      setLoadingBids(false);
      return;
    }

    // ✅ Put user into a parameter so TypeScript knows it is NOT null
    async function loadBids(currentUser: User) {
      setLoadingBids(true);
      setError(null);

      const { data, error } = await supabase
        .from("bids")
        .select(
          `
          id,
          amount,
          created_at,
          listing:marketplace_listings (
            id,
            title,
            image_url,
            current_bid,
            starting_price,
            ends_at,
            status,
            buyer_id
          )
        `
        )
        .eq("bidder_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setBids([]);
        setLoadingBids(false);
        return;
      }

      const mapped: BidRow[] =
        data?.map((row: any) => ({
          id: row.id as number,
          amount: Number(row.amount),
          created_at: row.created_at as string,
          listing: row.listing
            ? {
                id: row.listing.id,
                title: row.listing.title,
                image_url: row.listing.image_url,
                current_bid: row.listing.current_bid,
                starting_price: row.listing.starting_price,
                ends_at: row.listing.ends_at,
                status: row.listing.status,
                buyer_id: row.listing.buyer_id,
              }
            : null,
        })) ?? [];

      setBids(mapped);
      setLoadingBids(false);
    }

    // Call with a guaranteed non-null user
    loadBids(user);
  }, [user]);

  // ---- States: loading / not logged in -------------------------------------

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-sm text-neutral-600">Loading your account...</p>
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
            Please sign in or sign up to view your bids.
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

  // ---- Main page -----------------------------------------------------------

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">My bids</h1>
            <p className="mt-1 text-xs text-neutral-500">
              These are the bids you&apos;ve placed on Elmzad listings.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
          >
            ← Back to home
          </Link>
        </div>

        {loadingBids && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            Loading your bids...
          </div>
        )}

        {error && !loadingBids && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load your bids: {error}
          </div>
        )}

        {!loadingBids && !error && bids.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
            <p className="mb-2 text-neutral-800 font-medium">
              You haven&apos;t placed any bids yet.
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              Explore listings on the homepage and start bidding on items you
              like.
            </p>
            <Link
              href="/"
              className="inline-block rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
            >
              Browse listings
            </Link>
          </div>
        )}

        {!loadingBids && !error && bids.length > 0 && (
          <div className="space-y-3">
            {bids.map((bid) => {
              const listing = bid.listing;

              const currentBid = listing ? Number(listing.current_bid) : null;
              const startingPrice = listing
                ? Number(listing.starting_price)
                : null;

              const isSold = listing?.status === "sold";
              const isWinner =
                isSold && listing?.buyer_id && listing.buyer_id === user.id;

              return (
                <div
                  key={bid.id}
                  className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm"
                >
                  {/* Image */}
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-neutral-100 flex items-center justify-center">
                    {listing && listing.image_url ? (
                      <img
                        src={listing.image_url}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] text-neutral-500">
                        No image
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    {listing ? (
                      <Link
                        href={`/listing/${listing.id}`}
                        className="text-sm font-semibold text-neutral-900 hover:underline line-clamp-2"
                      >
                        {listing.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-neutral-900">
                        Listing not available
                      </p>
                    )}

                    <p className="mt-1 text-[11px] text-neutral-500">
                      Your bid:{" "}
                      <span className="font-semibold text-neutral-800">
                        {bid.amount.toLocaleString()} AED
                      </span>{" "}
                      · Placed on {formatShortDateTime(bid.created_at)}
                    </p>

                    {listing && (
                      <p className="mt-1 text-[11px] text-neutral-500">
                        Current bid:{" "}
                        <span className="font-semibold text-neutral-800">
                          {currentBid !== null
                            ? currentBid.toLocaleString()
                            : "-"}{" "}
                          AED
                        </span>
                        {startingPrice !== null && (
                          <>
                            {" "}
                            · Starting price:{" "}
                            {startingPrice.toLocaleString()} AED
                          </>
                        )}
                      </p>
                    )}

                    {listing && (
                      <p className="mt-1 text-[11px] text-neutral-500">
                        Ends: {formatShortDateTime(listing.ends_at)}
                      </p>
                    )}

                    {isWinner && (
                      <p className="mt-1 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 border border-green-200">
                        🎉 You won this item
                      </p>
                    )}

                    {listing && (
                      <div className="mt-1">
                        <Link
                          href={`/listing/${listing.id}`}
                          className="inline-block text-[11px] font-medium"
                          style={{ color: BRAND_RED }}
                        >
                          View listing →
                        </Link>
                      </div>
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
