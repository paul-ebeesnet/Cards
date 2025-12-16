import { ParsedTransactionData } from "../types";

// Updated to the user's specific n8n Webhook URL
const WEBHOOK_URL = 'https://n8n-rqnubcyq.ap-northeast-1.clawcloudrun.com/webhook/topai-text';

// Helper to safely extract a number from various potential keys
const findNumber = (obj: any, keys: string[]): number => {
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val.replace(/[^\d.-]/g, '')); // Remove currency symbols if any
        if (!isNaN(parsed)) return parsed;
      }
    }
  }
  return 0;
};

// Normalize a single raw object into our App's structure
const normalizeSingleTransaction = (rawData: any): ParsedTransactionData => {
  // Normalize keys: Remove whitespace from keys (e.g., " consumption_amount " -> "consumption_amount")
  const normalizedData: Record<string, any> = {};
  if (rawData && typeof rawData === 'object') {
    Object.keys(rawData).forEach(key => {
      normalizedData[key.trim()] = rawData[key];
    });
  }

  // 1. Store Name
  const storeName = normalizedData.storeName || normalizedData.store_name || normalizedData.store || 'Unknown Store';
  
  // 2. Card Number
  const cardNumber = normalizedData.cardNumber || normalizedData.card_number || normalizedData.card_id || '0000';
  
  // 3. Date
  const transactionDate = normalizedData.transactionDate || normalizedData.date || normalizedData.transaction_date || new Date().toISOString().split('T')[0];

  // 4. Amount 
  const amount = findNumber(normalizedData, [
    'amount', 
    'consumption_amount', 
    'consumptionAmount', 
    'recharge_amount', 
    'rechargeAmount',
    'money',
    'cost'
  ]);

  // 5. Balance
  const balanceAfter = findNumber(normalizedData, [
    'balanceAfter', 
    'remaining_balance', 
    'remainingBalance', 
    'balance', 
    'new_balance',
    'current_balance'
  ]);

  // 6. Type
  let type: 'consumption' | 'recharge' = 'consumption';
  const rawType = String(normalizedData.type || normalizedData.Type || '').toLowerCase().trim();
  if (rawType.includes('recharge') || rawType.includes('充值') || rawType === 'income') {
    type = 'recharge';
  }

  return {
    storeName: String(storeName).trim(),
    cardNumber: String(cardNumber).trim(), 
    transactionDate,
    amount,
    balanceAfter,
    type
  };
};

// --- OFFLINE FALLBACK PARSER ---
// Used when the Webhook fails (CORS, Network Error, etc.)
const parseWithLocalRegex = (text: string): ParsedTransactionData[] => {
  const results: ParsedTransactionData[] = [];
  
  // Split by common delimiters if multiple messages are pasted. 
  // Relaxed length check to allow shorter messages.
  const lines = text.split(/\n+/).filter(l => l.trim().length > 5);

  lines.forEach(line => {
    // Regex for Store Name: Matches 【StoreName】 or [StoreName]
    const storeMatch = line.match(/[【\[](.*?)[】\]]/);
    const storeName = storeMatch ? storeMatch[1] : "Parsed Store";

    // Regex for Date: YYYY-MM-DD
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
    const transactionDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    // Regex for Card: ***1234
    const cardMatch = line.match(/[\*]{3,}(\d{3,4})/);
    const cardNumber = cardMatch ? cardMatch[1] : "0000";

    // Regex for Type & Amount: "消费：316.0" or "充值：500"
    // Matches "消费" or "recharge" followed by colon and digits
    const amountMatch = line.match(/(消费|充值|consumption|recharge).*?[:：]\s*(\d+(\.\d+)?)/i);
    
    let type: 'consumption' | 'recharge' = 'consumption';
    let amount = 0;

    if (amountMatch) {
        const typeStr = amountMatch[1];
        if (typeStr.includes('充值') || typeStr.toLowerCase().includes('recharge')) {
            type = 'recharge';
        }
        amount = parseFloat(amountMatch[2]);
    }

    // Regex for Balance: "余额为：4443.0"
    const balanceMatch = line.match(/(余额|balance).*?[:：]\s*(\d+(\.\d+)?)/i);
    const balanceAfter = balanceMatch ? parseFloat(balanceMatch[2]) : 0;

    // Only add if we found at least an amount
    if (amount > 0) {
        results.push({
            storeName,
            cardNumber,
            transactionDate,
            amount,
            balanceAfter,
            type
        });
    }
  });

  return results;
};

// --- MAIN PARSE FUNCTION ---
export const parseTransactionText = async (text: string): Promise<ParsedTransactionData[]> => {
  if (!text) return [];

  try {
    // 15 second timeout to prevent hanging forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Webhook responded with ${response.status}`);
    }

    const data = await response.json();
    
    // Normalize response (n8n might return array or single object, or wrapped object)
    let rawItems: any[] = [];
    if (Array.isArray(data)) {
        rawItems = data;
    } else if (typeof data === 'object') {
        // Handle n8n output structure if it returns { data: [...] } or { output: [...] }
        // For now assume direct object or simple wrapper, defaulting to single item
        rawItems = [data];
    }

    const parsed = rawItems.map(normalizeSingleTransaction).filter(t => t.amount > 0);
    
    if (parsed.length === 0) {
        throw new Error("No valid transactions found in AI response");
    }

    return parsed;

  } catch (error) {
    console.warn("Webhook failed, falling back to local regex:", error);
    // Silent fallback to local regex
    return parseWithLocalRegex(text);
  }
};