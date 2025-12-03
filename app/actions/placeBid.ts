"use server";

import { createClient } from "@supabase/supabase-js";

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}

export async function placeBid(formData: FormData) {
  const supabase = getSupabaseServerClient();

  const listingId = Number(formData.get("listingId"));
  const bidAmount = Number(formData.get("bidAmount"));

  // Basic validation
  if (!listingId || Number.isNaN(listingId)) {
    return { success: false, error: "Invalid listing ID." };
  }

  if (!bidAmount || Number.isNaN(bidAmount)) {
    return { success: false, error: "Please enter a valid bid amount." };
  }

  // Load current listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, current_price, currency")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    console.error("Listing fetch error:", listingError);
    return { success: false, error: "Listing not found." };
  }

  const currentPrice = Number(listing.current_price ?? 0);

  if (bidAmount <= currentPrice) {
    return {
      success: false,
      error: `Your bid must be higher than the current price (${currentPrice} ${listing.currency ?? "AED"}).`,
    };
  }

  // Insert into bids table
  const { error: insertError } = await supabase.from("bids").insert({
    listing_id: listingId,
    amount: bidAmount,
    currency: listing.currency ?? "AED",
  });

  if (insertError) {
    console.error("Insert bid error:", insertError);
    return {
      success: false,
      error: `Could not save bid: ${insertError.message}`,
    };
  }

  // Update listing current_price
  const { error: updateError } = await supabase
    .from("listings")
    .update({ current_price: bidAmount })
    .eq("id", listingId);

  if (updateError) {
    console.error("Update listing error:", updateError);
    return {
      success: false,
      error: `Bid saved, but failed to update listing price: ${updateError.message}`,
    };
  }

  return { success: true };
}
