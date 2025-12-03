// app/listing/[id]/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabaseClient";

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
  status?: string | null;
};

type Listing = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  startingPrice: number;
  currentBid: number;
  minIncrement: number;
  imageUrl: string | null;
  endsAt: string;
  buyNowPrice: number | null;
  sellerId: string | null;
  status: string; // 'active' | 'sold' | anything else
};

type Bid = {
  id: number;
  amount: number;
  createdAt: string;
};

function formatTimeLeft(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Auction ended";

  const days = Math.floor(secondsLeft / (24 * 3600));
  const hours = Math.floor((secondsLeft % (24 * 3600)) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function ListingPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const [bidAmount, setBidAmount] = useState<string>("");
  const [bidError, setBidError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [buyNowMsg, setBuyNowMsg] = useState<string | null>(null);

  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [isPlacingBid, setIsPlacingBid] = useState<boolean>(false);

  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState<boolean>(true);

  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState<boolean>(false);
  const [bidsError, setBidsError] = useState<string | null>(null);

  // ---- Load logged-in user ------------------------------------------------
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setUserLoading(false);
    }
    loadUser();
  }, []);

  // ---- Load listing -------------------------------------------------------
  useEffect(() => {
    async function loadListing() {
      setLoading(true);
      setLoadError(null);

      if (!id || Number.isNaN(id)) {
        setLoadError("Invalid listing id.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("id", id)
        .maybeSingle<DbRow>();

      if (error) {
        setLoadError(error.message);
        setListing(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoadError("Listing not found.");
        setListing(null);
        setLoading(false);
        return;
      }

      const normalized: Listing = {
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        startingPrice: Number(data.starting_price),
        currentBid: Number(data.current_bid),
        minIncrement: Number(data.min_increment),
        imageUrl: data.image_url,
        endsAt: data.ends_at,
        buyNowPrice:
          data.buy_now_price !== undefined && data.buy_now_price !== null
            ? Number(data.buy_now_price)
            : null,
        sellerId: data.seller_id ?? null,
        status: data.status ?? "active",
      };

      setListing(normalized);
      setLoading(false);
    }

    loadListing();
  }, [id]);

  // ---- Load bid history ---------------------------------------------------
  useEffect(() => {
    if (!id) return;

    async function loadBids() {
      setBidsLoading(true);
      setBidsError(null);

      const { data, error } = await supabase
        .from("bids")
        .select("id, amount, created_at")
        .eq("listing_id", id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        setBidsError(error.message);
        setBidHistory([]);
        setBidsLoading(false);
        return;
      }

      const mapped: Bid[] =
        data?.map((row: any) => ({
          id: row.id as number,
          amount: Number(row.amount),
          createdAt: row.created_at as string,
        })) ?? [];

      setBidHistory(mapped);
      setBidsLoading(false);
    }

    loadBids();
  }, [id]);

  // ---- Timer --------------------------------------------------------------
  useEffect(() => {
    if (!listing) return;

    const target = new Date(listing.endsAt).getTime();

    const update = () => {
      const diffMs = target - Date.now();
      const seconds = Math.max(0, Math.floor(diffMs / 1000));
      setSecondsLeft(seconds);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [listing]);

  // ---- Status & auction end logic -----------------------------------------
  const isSold = listing?.status === "sold";
  const auctionEnded = secondsLeft <= 0 || isSold;

  const minimumAllowedBid =
    listing?.currentBid && listing?.minIncrement
      ? listing.currentBid + listing.minIncrement
      : listing
      ? listing.startingPrice + listing.minIncrement
      : 0;

  // ---- Place bid (with self-bid block) ------------------------------------
  const handlePlaceBid = async () => {
    setBidError(null);
    setSuccessMsg(null);
    setBuyNowMsg(null);

    if (!listing) {
      setBidError("Listing is not loaded.");
      return;
    }

    if (auctionEnded) {
      setBidError(
        isSold ? "This item has been sold." : "The auction has already ended."
      );
      return;
    }

    if (userLoading) {
      setBidError("Checking your account, please wait a moment.");
      return;
    }

    if (!user) {
      setBidError("You must be signed in to place a bid.");
      return;
    }

    // 🚫 Block self-bidding
    if (listing.sellerId && listing.sellerId === user.id) {
      setBidError("You cannot bid on your own listing.");
      return;
    }

    if (!bidAmount) {
      setBidError("Enter your bid amount.");
      return;
    }

    const numericBid = Number(bidAmount);
    if (Number.isNaN(numericBid) || numericBid <= 0) {
      setBidError("Enter a valid positive number.");
      return;
    }

    if (numericBid < minimumAllowedBid) {
      setBidError(
        `Your bid must be at least ${minimumAllowedBid.toLocaleString()} AED.`
      );
      return;
    }

    setIsPlacingBid(true);

    // 1) Insert into bids table
    const { data: insertedRows, error: insertError } = await supabase
      .from("bids")
      .insert({
        listing_id: listing.id,
        bidder_id: user.id,
        amount: numericBid,
      })
      .select()
      .limit(1);

    if (insertError) {
      setIsPlacingBid(false);
      setBidError(insertError.message);
      return;
    }

    const inserted = insertedRows?.[0];

    // 2) Update current_bid
    const { error: updateError } = await supabase
      .from("marketplace_listings")
      .update({ current_bid: numericBid })
      .eq("id", listing.id);

    setIsPlacingBid(false);

    if (updateError) {
      console.error("Error updating current_bid:", updateError);
      setBidError("Failed to update current bid: " + updateError.message);
      return;
    }

    // 3) Update UI
    setListing((prev) =>
      prev
        ? {
            ...prev,
            currentBid: numericBid,
          }
        : prev
    );

    // 4) Update history in UI
    if (inserted) {
      const newBid: Bid = {
        id: inserted.id as number,
        amount: Number(inserted.amount),
        createdAt: inserted.created_at as string,
      };
      setBidHistory((prev) => [newBid, ...prev].slice(0, 5));
    }

    setBidAmount("");
    setSuccessMsg("Your bid has been placed successfully.");
  };

  // ---- Buy Now → mark as sold ---------------------------------------------
  const handleBuyNow = async () => {
    setBidError(null);
    setSuccessMsg(null);
    setBuyNowMsg(null);

    if (!listing || listing.buyNowPrice == null) return;

    if (userLoading) {
      setBuyNowMsg("Checking your account, please wait a moment.");
      return;
    }

    if (!user) {
      setBuyNowMsg("You must be signed in to use Buy Now.");
      return;
    }

    // Block self-buy
    if (listing.sellerId && listing.sellerId === user.id) {
      setBuyNowMsg("You cannot buy your own listing.");
      return;
    }

    if (auctionEnded) {
      setBuyNowMsg(
        isSold ? "This item has already been sold." : "The auction has ended."
      );
      return;
    }

    const buyNowValue = listing.buyNowPrice;
    setIsPlacingBid(true);

    const { error } = await supabase
      .from("marketplace_listings")
      .update({
        status: "sold",
        current_bid: buyNowValue,
      })
      .eq("id", listing.id);

    setIsPlacingBid(false);

    if (error) {
      setBuyNowMsg("Failed to complete Buy Now: " + error.message);
      return;
    }

    // Update UI state
    setListing((prev) =>
      prev
        ? {
            ...prev,
            status: "sold",
            currentBid: buyNowValue,
          }
        : prev
    );

    setBuyNowMsg(
      `Item marked as sold for ${buyNowValue.toLocaleString()} AED. (Payment flow to be implemented.)`
    );
  };

  const toggleWishlist = () => {
    setIsWishlisted((prev) => !prev);
  };

  // ---- Loading / error states ---------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-sm text-neutral-600">Loading listing...</p>
      </main>
    );
  }

  if (loadError || !listing) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm text-sm">
          <h1 className="mb-2 text-lg font-semibold text-neutral-900">
            Listing not available
          </h1>
          <p className="mb-3 text-neutral-700">
            {loadError || "We could not find this listing."}
          </p>
          <Link
            href="/"
            className="inline-block rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
          >
            Back to Elmzad home
          </Link>
        </div>
      </main>
    );
  }

  // Derive status label
  let statusLabel = "Active";
  if (isSold) statusLabel = "Sold";
  else if (secondsLeft <= 0) statusLabel = "Ended";

  // ---- Main layout --------------------------------------------------------
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <div className="mb-3 text-xs text-neutral-500">
          <Link href="/" className="hover:underline">
            Elmzad
          </Link>{" "}
          / <span>{listing.category || "Other"}</span>
        </div>

        {/* Title + status */}
        <div className="mb-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-semibold text-neutral-900">
            {listing.title}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              isSold
                ? "bg-red-100 text-red-700 border border-red-200"
                : secondsLeft <= 0
                ? "bg-neutral-100 text-neutral-700 border border-neutral-200"
                : "bg-green-100 text-green-700 border border-green-200"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Listed by */}
        <p className="mb-1 text-[11px] text-neutral-500">
          {user && listing.sellerId === user.id
            ? "Listed by: You"
            : "Listed by: Elmzad seller"}
        </p>

        <p className="mb-4 text-xs text-neutral-500">
          Category: {listing.category || "Other"}
          {listing.location ? ` · Location: ${listing.location}` : ""}
        </p>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* LEFT COLUMN – Image + overview + bid history */}
          <div className="w-full md:w-2/3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            {listing.imageUrl ? (
              <div className="relative mb-4 h-72 w-full overflow-hidden rounded-md bg-neutral-100">
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="mb-4 flex h-72 w-full items-center justify-center rounded-md bg-neutral-100 text-xs text-neutral-500">
                No image provided
              </div>
            )}

            <div className="space-y-4 text-sm text-neutral-700">
              {/* Item overview */}
              <div>
                <h2 className="mb-1 text-sm font-semibold">Item overview</h2>
                <p>
                  {listing.description ||
                    "No detailed description was provided for this item."}
                </p>
              </div>

              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <p>
                  <span className="font-medium">Condition: </span>
                  Used – Very good (placeholder)
                </p>
                <p>
                  <span className="font-medium">Ships from: </span>
                  {listing.location || "UAE"}
                </p>
                <p>
                  <span className="font-medium">Returns: </span>
                  Seller&apos;s return policy applies (placeholder)
                </p>
                <p>
                  <span className="font-medium">Payment: </span>
                  Cash, card, or online payment (configurable later)
                </p>
              </div>

              {/* Bid history */}
              <div className="border-t border-neutral-100 pt-3">
                <h2 className="mb-1 text-sm font-semibold">
                  Bid history (last 5 bids)
                </h2>

                {bidsLoading && (
                  <p className="text-xs text-neutral-500">Loading bids…</p>
                )}

                {bidsError && (
                  <p className="text-xs text-red-600">
                    Could not load bids: {bidsError}
                  </p>
                )}

                {!bidsLoading && !bidsError && bidHistory.length === 0 && (
                  <p className="text-xs text-neutral-500">
                    No bids yet. Be the first to bid.
                  </p>
                )}

                {!bidsLoading && !bidsError && bidHistory.length > 0 && (
                  <ul className="mt-1 space-y-1 text-xs text-neutral-700">
                    {bidHistory.map((bid) => (
                      <li
                        key={bid.id}
                        className="flex items-center justify-between rounded-md bg-neutral-50 px-2 py-1"
                      >
                        <span className="font-medium">
                          {bid.amount.toLocaleString()} AED
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {new Date(bid.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN – Bidding panel */}
          <div className="w-full md:w-1/3 space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm text-sm relative">
              {/* Wishlist heart */}
              <button
                type="button"
                onClick={toggleWishlist}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm transition hover:border-red-400 hover:text-red-500"
                aria-label="Add to wishlist"
              >
                <span
                  className={`text-base ${
                    isWishlisted ? "text-red-600" : "text-neutral-400"
                  }`}
                >
                  ♥
                </span>
              </button>

              {/* Timer */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-neutral-500">
                  Time left
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {isSold
                    ? "Item sold"
                    : formatTimeLeft(secondsLeft)}
                </p>
              </div>

              {/* Current bid */}
              <div className="border-t border-neutral-100 pt-3">
                <p className="text-xs font-semibold text-neutral-500">
                  Current bid
                </p>
                <p className="text-lg font-semibold text-neutral-900">
                  {listing.currentBid.toLocaleString()} AED
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Starting price: {listing.startingPrice.toLocaleString()} AED
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Minimum increment: {listing.minIncrement.toLocaleString()} AED
                </p>
              </div>

              {/* Place bid */}
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <p className="text-xs font-semibold text-neutral-500">
                  Place your bid
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
                    placeholder={`Min ${minimumAllowedBid.toLocaleString()} AED`}
                    disabled={auctionEnded}
                  />
                  <button
                    type="button"
                    onClick={handlePlaceBid}
                    disabled={auctionEnded || isPlacingBid}
                    className="whitespace-nowrap rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:bg-neutral-300"
                  >
                    {isPlacingBid ? "Placing..." : "Place bid"}
                  </button>
                </div>
              </div>

              {/* Buy now */}
              {listing.buyNowPrice != null && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={auctionEnded || isPlacingBid}
                    className="w-full rounded-full border border-red-600 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:border-neutral-300 disabled:text-neutral-400"
                  >
                    Buy now for {listing.buyNowPrice.toLocaleString()} AED
                  </button>
                </div>
              )}

              {/* Messages */}
              {bidError && (
                <p className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1">
                  {bidError}
                </p>
              )}

              {successMsg && (
                <p className="mt-2 text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-md px-2 py-1">
                  {successMsg}
                </p>
              )}

              {buyNowMsg && (
                <p className="mt-2 text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-md px-2 py-1">
                  {buyNowMsg}
                </p>
              )}

              {auctionEnded && (
                <p className="mt-2 text-[11px] font-medium text-red-600">
                  {isSold
                    ? "This item has been sold."
                    : "This auction has ended."}
                </p>
              )}
            </div>

            <Link
              href="/"
              className="block rounded-full border border-neutral-300 bg-white px-4 py-2 text-center text-xs font-medium text-neutral-800 hover:bg-neutral-100"
            >
              ← Back to Elmzad home
            </Link>
          </div>
        </div>

        {/* Extra info cards */}
        <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p
              className="text-[11px] font-semibold"
              style={{ color: BRAND_RED }}
            >
              How bidding works
            </p>
            <p className="mt-1 text-neutral-600 text-xs">
              Place a bid higher than the current offer. When the auction ends,
              the highest bid above the minimum increment wins.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p
              className="text-[11px] font-semibold"
              style={{ color: BRAND_RED }}
            >
              Buyer protection
            </p>
            <p className="mt-1 text-neutral-600 text-xs">
              Payment is completed through Elmzad. We aim to protect both buyer
              and seller with clear rules and dispute handling.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p
              className="text-[11px] font-semibold"
              style={{ color: BRAND_RED }}
            >
              Seller details
            </p>
            <p className="mt-1 text-neutral-600 text-xs">
              Seller ratings and profile will be shown here in future versions.
              For now, Elmzad verifies accounts via email.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
