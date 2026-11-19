// Payout adapter ("the bot").
//
// Cash App does not offer a public consumer payout API, so this module is the single place
// where a payout provider plugs in. Configure PAYOUT_PROVIDER_URL + PAYOUT_PROVIDER_KEY to
// point at any service that can send a Cash App payment to a $cashtag (for example a
// licensed payout partner or your own Cash App-approved sending service). It POSTs:
//   { payoutId, cashtag, amountCents, currency, note }
// and expects JSON like { id: "provider-transaction-id" } on success.
//
// Without those variables the payout stays "pending" and you send it manually in Cash App,
// then mark it paid in the admin panel with the Cash App transaction ID.

export type PayoutRequest = {
  payoutId: number;
  cashtag: string;
  amountCents: number;
  note: string;
};

export type PayoutResult =
  | { mode: "provider"; status: "sent"; providerRef: string | null; message: string }
  | { mode: "manual"; status: "pending"; message: string };

export function payoutProviderConfigured() {
  return Boolean(process.env.PAYOUT_PROVIDER_URL && process.env.PAYOUT_PROVIDER_KEY);
}

export async function sendCashAppPayout(req: PayoutRequest): Promise<PayoutResult> {
  const url = process.env.PAYOUT_PROVIDER_URL;
  const key = process.env.PAYOUT_PROVIDER_KEY;

  if (!url || !key) {
    return {
      mode: "manual",
      status: "pending",
      message: "No payout provider configured. Send this amount in Cash App, then mark it paid.",
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      payoutId: req.payoutId,
      cashtag: req.cashtag,
      amountCents: req.amountCents,
      currency: "USD",
      note: req.note,
    }),
  });

  if (!res.ok) {
    throw new Error(`Payout provider responded with ${res.status}`);
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string; reference?: string };
  return {
    mode: "provider",
    status: "sent",
    providerRef: data.id ?? data.reference ?? null,
    message: "Sent through payout provider.",
  };
}
