import { logger } from "./logger";

// USDT-TRC20 contract address on the TRON mainnet.
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
// USDT on TRON has 6 decimals.
const USDT_DECIMALS = 6;

const TRONGRID_BASE = process.env.TRONGRID_API_URL ?? "https://api.trongrid.io";
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY ?? "";

export type TronVerifyResult =
  | { ok: true; amountUsd: number; fromAddress: string; toAddress: string }
  | { ok: false; reason: string };

interface RawEvent {
  transaction_id?: string;
  contract_address?: string;
  event_name?: string;
  block_timestamp?: number;
  result?: { from?: string; to?: string; value?: string };
}

interface TxInfoResponse {
  receipt?: { result?: string };
  ret?: Array<{ contractRet?: string }>;
}

function authHeaders(): Record<string, string> {
  return TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": TRONGRID_API_KEY } : {};
}

// Confirm the transaction executed successfully on-chain.
async function isTransactionSuccessful(txId: string): Promise<boolean> {
  try {
    const res = await fetch(`${TRONGRID_BASE}/wallet/gettransactioninfobyid`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ value: txId }),
    });
    if (!res.ok) return false;
    const info = (await res.json()) as TxInfoResponse;
    // An empty object means the tx is not yet confirmed / not found.
    if (!info || Object.keys(info).length === 0) return false;
    const receiptResult = info.receipt?.result;
    const contractRet = info.ret?.[0]?.contractRet;
    if (receiptResult && receiptResult !== "SUCCESS") return false;
    if (contractRet && contractRet !== "SUCCESS") return false;
    return true;
  } catch (err) {
    logger.error({ err }, "tron: gettransactioninfobyid failed");
    return false;
  }
}

// Fetch the Transfer events emitted by a transaction (TRC20 token movements).
async function fetchTransferEvents(txId: string): Promise<RawEvent[]> {
  try {
    const res = await fetch(
      `${TRONGRID_BASE}/v1/transactions/${txId}/events?only_confirmed=true`,
      { headers: authHeaders() },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: RawEvent[] };
    return (json.data ?? []).filter((e) => e.event_name === "Transfer");
  } catch (err) {
    logger.error({ err }, "tron: events lookup failed");
    return [];
  }
}

/**
 * Verify a USDT-TRC20 transfer.
 * Checks: tx exists & succeeded, is a USDT transfer, destination matches the
 * expected address, and amount >= expected. Caller is responsible for ensuring
 * the txId has not been used before (DB unique constraint on payments.tx_id).
 */
export async function verifyUsdtTransfer(
  txId: string,
  expectedToAddress: string,
  expectedAmountUsd: number,
): Promise<TronVerifyResult> {
  const trimmed = txId.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return { ok: false, reason: "invalid_txid" };
  }
  if (!expectedToAddress) {
    return { ok: false, reason: "no_destination_configured" };
  }

  const ok = await isTransactionSuccessful(trimmed);
  if (!ok) return { ok: false, reason: "tx_not_confirmed" };

  const events = await fetchTransferEvents(trimmed);
  if (events.length === 0) return { ok: false, reason: "no_matching_transfer" };

  const match = events.find(
    (e) =>
      (e.contract_address ?? "").toLowerCase() === USDT_CONTRACT.toLowerCase() &&
      e.result?.to === expectedToAddress,
  );
  if (!match || !match.result) {
    return { ok: false, reason: "no_matching_transfer" };
  }

  const amountUsd = Number(match.result.value ?? "0") / Math.pow(10, USDT_DECIMALS);

  // Allow a tiny tolerance for rounding.
  if (amountUsd + 0.01 < expectedAmountUsd) {
    return { ok: false, reason: "amount_too_low" };
  }

  return {
    ok: true,
    amountUsd,
    fromAddress: match.result.from ?? "",
    toAddress: match.result.to ?? "",
  };
}

export function tronVerifyReasonText(reason: string): string {
  switch (reason) {
    case "invalid_txid": return "The transaction hash format is invalid. Please send a valid 64-character TxID.";
    case "no_destination_configured": return "Payment address is not configured. Please contact the administrator.";
    case "tx_not_confirmed": return "Transaction not found or not yet confirmed on the TRON network. Wait a minute and try again.";
    case "no_matching_transfer": return "No USDT transfer to our address was found in that transaction.";
    case "amount_too_low": return "The amount sent is less than the required amount.";
    default: return "Could not verify the transaction. Please check the TxID and try again.";
  }
}
