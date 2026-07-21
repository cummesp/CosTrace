// Supabase Edge Function: update-exchange-rates
//
// Runs once a day (see cron in exchange_rates_migration.sql) and refreshes
// the exchange_rates table with the latest EUR-pivoted rates for every
// currency in COMMON_CURRENCIES (App.jsx). Rates here are only ever used as
// a *suggestion* pre-filled into the Ledger Settings currency-pair form —
// once an expense is entered, its conversion is locked in permanently and
// never re-reads this table, so a daily refresh can never silently change
// historical balances.
//
// Source: open.er-api.com — free, no API key required, updates daily.
//
// Deploy with:  supabase functions deploy update-exchange-rates --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("RATES_CRON_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Keep in sync with COMMON_CURRENCIES in App.jsx.
const CURRENCIES = [
  "RSD", "EUR", "USD", "GBP", "CHF", "HUF", "BAM", "RON", "TRY", "AED",
  "AUD", "CAD", "JPY", "CNY", "INR",
];

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR");
    const data = await res.json();

    if (data.result !== "success" || !data.rates) {
      console.error("Unexpected response from open.er-api.com", data);
      return new Response("OK (fetch failed, logged)", { status: 200 });
    }

    const rows = CURRENCIES.filter((c) => data.rates[c] != null).map((c) => ({
      currency: c,
      rate_to_eur: data.rates[c],
      updated_at: new Date().toISOString(),
    }));

    const { error } = await sb.from("exchange_rates").upsert(rows, { onConflict: "currency" });
    if (error) {
      console.error("Failed to upsert exchange rates", error);
      return new Response("OK (upsert failed, logged)", { status: 200 });
    }

    // Rebuild a lookup for cross-rate math: rate_to_eur[X] = how many units
    // of X equal 1 EUR.
    const rateToEur: Record<string, number> = {};
    rows.forEach((r) => (rateToEur[r.currency] = r.rate_to_eur));
    const crossRate = (from: string, to: string) =>
      rateToEur[from] && rateToEur[to] ? rateToEur[to] / rateToEur[from] : null;

    // Only touch ledgers that opted in per-pair (currency_pairs[].auto_update
    // === true) — everyone else's rate stays exactly as they set it. This
    // never touches already-saved expenses, only the ledger's current
    // "default rate for new expenses" going forward.
    const { data: ledgers, error: lErr } = await sb
      .from("ledgers")
      .select("id, currency, currency_pairs")
      .not("currency_pairs", "eq", "[]");
    if (lErr) {
      console.error("Failed to fetch ledgers for auto-update", lErr);
      return new Response(JSON.stringify({ updated: rows.length, ledgersUpdated: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let ledgersUpdated = 0;
    for (const l of ledgers || []) {
      const pairs = (l.currency_pairs || []) as { currency: string; rate: number; auto_update?: boolean }[];
      if (!pairs.some((p) => p.auto_update)) continue;
      const updatedPairs = pairs.map((p) => {
        if (!p.auto_update) return p;
        const fresh = crossRate(p.currency, l.currency);
        return fresh !== null ? { ...p, rate: +fresh.toFixed(4) } : p;
      });
      const { error: updErr } = await sb
        .from("ledgers")
        .update({ currency_pairs: updatedPairs })
        .eq("id", l.id);
      if (!updErr) ledgersUpdated++;
    }

    return new Response(JSON.stringify({ updated: rows.length, ledgersUpdated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-exchange-rates error", e);
    return new Response("OK (error logged)", { status: 200 });
  }
});
