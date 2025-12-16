export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface StoreCard {
  id: string;
  userId: string;
  storeName: string;
  cardNumber: string; // usually last 4 digits
  currentBalance: number;
  lastUpdated: string;
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
}

// Helper type for the AI extraction result
export interface ParsedTransactionData {
  storeName: string;
  cardNumber: string;
  transactionDate: string;
  amount: number;
  balanceAfter: number;
  type: 'consumption' | 'recharge';
}