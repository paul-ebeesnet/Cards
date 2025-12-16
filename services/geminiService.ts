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

  // 1. Store Name (or Bank Name / Description)
  const storeName = normalizedData.storeName || normalizedData.store_name || normalizedData.store || normalizedData.description || 'Unknown Store';
  
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
    'cost',
    'txn_amount'
  ]);

  // 5. Balance
  const balanceAfter = findNumber(normalizedData, [
    'balanceAfter', 
    'remaining_balance', 
    'remainingBalance', 
    'balance', 
    'new_balance',
    'current_balance',
    'outstanding',
    'limit'
  ]);

  // 6. Type
  let type: 'consumption' | 'recharge' = 'consumption';
  const rawType = String(normalizedData.type || normalizedData.Type || '').toLowerCase().trim();
  if (rawType.includes('recharge') || rawType.includes('充值') || rawType === 'income' || rawType.includes('payment') || rawType.includes('repayment')) {
    type = 'recharge';
  }

  // 7. Suggest Card Type (Credit/Prepaid)
  let suggestedCardType: 'prepaid' | 'credit' = 'prepaid';
  const combinedText = (JSON.stringify(normalizedData) + storeName).toLowerCase();
  if (combinedText.includes('bank') || combinedText.includes('credit') || combinedText.includes('visa') || combinedText.includes('master') || combinedText.includes('statement')) {
      suggestedCardType = 'credit';
  }

  // 8. Notes
  const notes = normalizedData.notes || normalizedData.note || '';

  return {
    storeName: String(storeName).trim(),
    cardNumber: String(cardNumber).trim(), 
    transactionDate,
    amount,
    balanceAfter,
    type,
    suggestedCardType,
    notes
  };
};

// --- OFFLINE FALLBACK PARSER ---
// Used when the Webhook fails (CORS, Network Error, etc.)
const parseWithLocalRegex = (text: string): ParsedTransactionData[] => {
  const results: ParsedTransactionData[] = [];
  
  // Split by common delimiters if multiple messages are pasted. 
  // Relaxed length check to allow shorter messages.
  const lines = text.split(/\n+/).filter(l => l.trim().length > 3);

  // Global Context (e.g. if the user pasted a header like "Credit Card Statement 8888")
  let globalCardNumber = "0000";
  const headerCardMatch = text.match(/[\*]{3,}(\d{4})/);
  if (headerCardMatch) globalCardNumber = headerCardMatch[1];
  
  let globalType: 'prepaid' | 'credit' = 'prepaid';
  if (text.toLowerCase().includes('bank') || text.toLowerCase().includes('credit')) {
      globalType = 'credit';
  }

  lines.forEach(line => {
    // 1. Try to find a Date (YYYY-MM-DD or MM/DD or DD/MM)
    // Matches 2023-10-01, 10/01, 01/10
    const dateMatch = line.match(/(\d{4}[-/]\d{2}[-/]\d{2})|(\d{1,2}[/-]\d{1,2})/);
    let transactionDate = new Date().toISOString().split('T')[0];
    if (dateMatch) {
        if (dateMatch[1]) transactionDate = dateMatch[1];
        else {
            // Assume current year for short dates
            const today = new Date();
            transactionDate = `${today.getFullYear()}-${dateMatch[0].replace('/', '-')}`; 
        }
    }

    // 2. Try to find an Amount
    // Looks for numbers with decimals, optionally currency symbols, at end of line or after :
    const amountMatch = line.match(/(?:HKD|USD|¥|\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
    // Find last number in the line often implies amount in statements
    const amounts = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
    
    let amount = 0;
    if (amounts && amounts.length > 0) {
        // Usually the last number is the amount or balance.
        // If there are 2 numbers, one might be balance.
        const val = parseFloat(amounts[0].replace(/,/g, ''));
        if (!isNaN(val)) amount = val;
    }

    // 3. Try to find Store Name / Description
    // Everything that isn't date or amount.
    let cleanLine = line.replace(dateMatch?.[0] || '', '').replace(amountMatch?.[0] || '', '').trim();
    // Remove common junk
    cleanLine = cleanLine.replace(/Transaction|Payment|Date|Amount|Balance/gi, '').trim();
    const storeName = cleanLine.length > 0 ? cleanLine.substring(0, 20) : "Parsed Transaction";

    // 4. Determine Type
    let type: 'consumption' | 'recharge' = 'consumption';
    if (line.includes('+') || line.toLowerCase().includes('repayment') || line.toLowerCase().includes('cr')) {
        type = 'recharge';
    }

    // 5. Card Number (Line specific override)
    const cardMatch = line.match(/[\*]{3,}(\d{3,4})/);
    const cardNumber = cardMatch ? cardMatch[1] : globalCardNumber;

    if (amount > 0) {
        results.push({
            storeName,
            cardNumber,
            transactionDate,
            amount,
            balanceAfter: 0, // Statements often don't show running balance per line
            type,
            suggestedCardType: globalType,
            notes: ''
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
        if (Array.isArray(data.data)) rawItems = data.data;
        else if (Array.isArray(data.output)) rawItems = data.output;
        else rawItems = [data];
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