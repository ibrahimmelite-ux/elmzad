"use client";

import { useState, useTransition } from "react";
import { placeBid } from "@/app/actions/placeBid";

type BidBoxProps = {
  listingId: number;
  currentPrice: number;
  currency: string;
};

export default function BidBox({
  listingId,
  currentPrice,
  currency,
}: BidBoxProps) {
  const [bidAmount, setBidAmount] = useState<string>(
    String(Math.round(currentPrice + 50))
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleAction(formData: FormData) {
    setError(null);
    setSuccessMessage(null);

    const result = await placeBid(formData);

    if (!result.success) {
      setError(result.error ?? "Failed to place bid. Please try again.");
    } else {
      setSuccessMessage("Bid placed successfully!");
    }
  }

  return (
    <section className="mt-6 border border-gray-200 bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold mb-2">Place a bid</h3>
      <p className="text-sm text-gray-600 mb-2">
        Current price:{" "}
        <span className="font-medium">
          {currentPrice.toFixed(2)} {currency}
        </span>
      </p>

      <form action={handleAction} className="flex flex-col sm:flex-row gap-2">
        <input type="hidden" name="listingId" value={listingId} />

        <input
          type="number"
          name="bidAmount"
          min={currentPrice + 1}
          step="1"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm w-full sm:w-40"
        />

        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Placing..." : "Place bid"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {successMessage && (
        <p className="mt-2 text-sm text-green-600">{successMessage}</p>
      )}
    </section>
  );
}
