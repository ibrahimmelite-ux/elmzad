// app/auth/signup/page.tsx

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setMsg("Sign up successful. Please check your email to confirm.");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-neutral-900">Sign up</h1>
        <p className="mb-4 text-sm text-neutral-600">
          Create your Elmzad account to start listing and bidding.
        </p>

        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1">
              {error}
            </p>
          )}
          {msg && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md px-2 py-1">
              {msg}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-neutral-300"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-xs text-neutral-600">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-red-600 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
