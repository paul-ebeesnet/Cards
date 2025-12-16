
export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface StoreCard {
  id: string;
  userId: string;
  storeName: string; // For credit cards, this is the Bank Name
  cardNumber: string; // usually last 4 digits
  currentBalance: number; // For credit cards, this can represent Outstanding Balance or Available Limit based on user preference
  lastUpdated: string;
  cardType?: 'prepaid' | 'credit'; // New field
  expiryDate?: string; // New field: ISO Date String (YYYY-MM-DD)
}

export interface Transaction {
  id: string;
  cardId: string;
  userId: string;
  amount: number;
  balanceAfter: number; // Snapshot of balance at this time
  date: string; // ISO String
  type: 'consumption' | 'recharge';
  rawText?: string;
  notes?: string; // New field
}

// Helper type for the AI extraction result
export interface ParsedTransactionData {
  storeName: string;
  cardNumber: string;
  transactionDate: string;
  amount: number;
  balanceAfter: number;
  type: 'consumption' | 'recharge';
  suggestedCardType?: 'prepaid' | 'credit';
  notes?: string;
}
