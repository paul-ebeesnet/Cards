import { StoreCard, Transaction, UserProfile } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// --- Helpers to map snake_case DB to camelCase App ---

const mapCardFromDB = (data: any): StoreCard => ({
  id: data.id,
  userId: data.user_id,
  storeName: data.store_name,
  cardNumber: data.card_number,
  currentBalance: parseFloat(data.current_balance),
  lastUpdated: data.last_updated
});

const mapTxnFromDB = (data: any): Transaction => ({
  id: data.id,
  cardId: data.card_id,
  userId: data.user_id,
  amount: parseFloat(data.amount),
  balanceAfter: parseFloat(data.balance_after || 0), // Include balance_after
  date: data.date,
  type: data.type as 'consumption' | 'recharge',
  rawText: data.raw_text
});

// --- Local Storage Cache Keys ---
const CACHE_KEY_CARDS = 'cardkeeper_cards_cache';
const CACHE_KEY_TXNS = 'cardkeeper_txns_cache';

// --- Auth / User ---

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Auth Session Error:", sessionError.message);
      return null;
    }
    
    if (!session?.user) {
      return null;
    }

    // Fetch profile for role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      // Return default if profile not found (e.g. trigger issue)
      return {
        id: session.user.id,
        email: session.user.email!,
        role: 'user' 
      };
    }

    return {
      id: session.user.id,
      email: session.user.email!,
      role: profile?.role || 'user'
    };
  } catch (err: any) {
    console.warn("getCurrentUser Network/System Error:", err.message || err);
    return null;
  }
};

export const signOut = async () => {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem(CACHE_KEY_CARDS);
    localStorage.removeItem(CACHE_KEY_TXNS);
  } catch (err: any) {
    console.error("SignOut Error:", err.message || err);
  }
};

// --- Card Operations ---

export const getCards = async (): Promise<StoreCard[]> => {
  if (!isSupabaseConfigured()) return []; 
  
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('last_updated', { ascending: false });
    
    if (error) {
      console.error("Error fetching cards:", error.message);
      throw error;
    }
    
    // Update Cache
    localStorage.setItem(CACHE_KEY_CARDS, JSON.stringify(data));
    return data.map(mapCardFromDB);
  } catch (err: any) {
    console.warn("getCards failed (Network?), checking cache...", err.message || err);
    const cached = localStorage.getItem(CACHE_KEY_CARDS);
    if (cached) {
      try {
        return JSON.parse(cached).map(mapCardFromDB);
      } catch (e) {
        return [];
      }
    }
    return [];
  }
};

export const getCardById = async (id: string): Promise<StoreCard | undefined> => {
  // First try to find in current cache for speed
  const cached = localStorage.getItem(CACHE_KEY_CARDS);
  if (cached) {
      const cards = JSON.parse(cached).map(mapCardFromDB);
      const found = cards.find((c: StoreCard) => c.id === id);
      if (found) return found;
  }

  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) return undefined;
    return mapCardFromDB(data);
  } catch (err: any) {
    console.error("getCardById Error:", err.message || err);
    return undefined;
  }
};

export const saveCard = async (card: Partial<StoreCard>): Promise<StoreCard> => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const payload = {
    user_id: user.id,
    store_name: card.storeName,
    card_number: card.cardNumber,
    current_balance: card.currentBalance,
    last_updated: new Date().toISOString()
  };

  try {
    if (card.id) {
        // Update
        const { data, error } = await supabase
        .from('cards')
        .update(payload)
        .eq('id', card.id)
        .select()
        .single();
        if (error) throw error;
        return mapCardFromDB(data);
    } else {
        // Insert
        const { data, error } = await supabase
        .from('cards')
        .insert(payload)
        .select()
        .single();
        if (error) throw error;
        return mapCardFromDB(data);
    }
  } catch (err: any) {
      console.error("saveCard Failed:", err.message || err);
      throw err;
  }
};

export const updateCardDetails = async (id: string, storeName: string, cardNumber: string, currentBalance: number): Promise<void> => {
  const { error } = await supabase
    .from('cards')
    .update({ 
      store_name: storeName,
      card_number: cardNumber,
      current_balance: currentBalance,
      last_updated: new Date().toISOString()
    })
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteCard = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const updateCardBalance = async (cardId: string, newBalance: number): Promise<void> => {
  const { error } = await supabase
    .from('cards')
    .update({ 
      current_balance: newBalance,
      last_updated: new Date().toISOString()
    })
    .eq('id', cardId);
  if (error) throw error;
};

// --- CORE LOGIC: Sync Balance from Latest Transaction ---

/**
 * Finds the most recent transaction (by Date) for a card and updates 
 * the card's current_balance to match that transaction's balance_after.
 */
export const syncCardBalance = async (cardId: string): Promise<void> => {
  try {
    // 1. Get the latest transaction for this card
    const { data, error } = await supabase
      .from('transactions')
      .select('balance_after')
      .eq('card_id', cardId)
      .order('date', { ascending: false }) // Latest date first
      .order('id', { ascending: false })   // Tie-breaker
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
      console.error("Error finding latest transaction:", error.message);
      return;
    }

    // 2. Determine new balance
    // If no transactions exist, balance implies 0 (or we could leave it, but 0 makes sense if history is cleared)
    const newBalance = data ? parseFloat(data.balance_after) : 0;

    // 3. Update the card
    await updateCardBalance(cardId, newBalance);

  } catch (err: any) {
    console.error("syncCardBalance Error:", err.message || err);
  }
};


// --- Transaction Operations ---

export const getTransactions = async (): Promise<Transaction[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false }); // Secondary sort for stability
    
    if (error) {
      console.error("Error fetching transactions:", error.message);
      throw error;
    }
    
    // Update Cache
    localStorage.setItem(CACHE_KEY_TXNS, JSON.stringify(data));
    return data.map(mapTxnFromDB);
  } catch (err: any) {
    console.warn("getTransactions Network Error, checking cache...", err.message || err);
    const cached = localStorage.getItem(CACHE_KEY_TXNS);
    if (cached) {
      try {
        return JSON.parse(cached).map(mapTxnFromDB);
      } catch (e) {
        return [];
      }
    }
    return [];
  }
};

export const getTransactionsByCardId = async (cardId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('card_id', cardId)
      .order('date', { ascending: false })
      .order('id', { ascending: false });
      
    if (error) throw error;
    return data.map(mapTxnFromDB);
  } catch (err: any) {
    console.error("getTransactionsByCardId Error:", err.message || err);
    return [];
  }
};

export const getTransactionById = async (id: string): Promise<Transaction | undefined> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return mapTxnFromDB(data);
  } catch (err: any) {
    console.error("Error fetching transaction:", err.message || err);
    return undefined;
  }
};

export const addTransaction = async (txn: Transaction): Promise<void> => {
  try {
    const { error } = await supabase
        .from('transactions')
        .insert({
        user_id: txn.userId,
        card_id: txn.cardId,
        amount: txn.amount,
        balance_after: txn.balanceAfter || 0, // IMPORTANT: Save the balance snapshot
        date: txn.date,
        type: txn.type,
        raw_text: txn.rawText
        });

    if (error) throw error;

    // After adding, ensure card balance reflects the latest state
    await syncCardBalance(txn.cardId);
  } catch (err: any) {
      console.error("addTransaction Failed:", err.message || err);
      throw err;
  }
};

export const updateTransaction = async (txn: Transaction): Promise<void> => {
  try {
    const { error } = await supabase
        .from('transactions')
        .update({
        amount: txn.amount,
        balance_after: txn.balanceAfter, // Update snapshot too
        date: txn.date,
        type: txn.type,
        })
        .eq('id', txn.id);

    if (error) throw error;

    // Sync balance again to ensure correctness
    await syncCardBalance(txn.cardId);
  } catch (err: any) {
      console.error("updateTransaction Failed:", err.message || err);
      throw err;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  // 1. Get the transaction first to know which card it belongs to
  const txn = await getTransactionById(id);
  if (!txn) return;

  // 2. Delete
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // 3. Recalculate Card Balance based on remaining history
  await syncCardBalance(txn.cardId);
};


// --- Admin Operations ---

export const getAdminStats = async () => {
  try {
    // Helper to get counts safely
    const { count: userCount, error: uErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: cardCount, error: cErr } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true });

    // Calculate total volume (sum of all consumption transactions)
    const { data: txns, error: tErr } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'consumption');
    
    const totalVolume = txns?.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) || 0;

    if (uErr || cErr || tErr) throw new Error("Stats fetch error");

    return { userCount: userCount || 0, cardCount: cardCount || 0, totalVolume };
  } catch (err: any) {
    console.error("Admin Stats Error:", err.message || err);
    return { userCount: 0, cardCount: 0, totalVolume: 0 };
  }
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email');
    
    if (error) throw error;
    
    // Map to UserProfile
    return data.map((p: any) => ({
      id: p.id,
      email: p.email,
      role: p.role as 'user' | 'admin'
    }));
  } catch (err: any) {
    console.error("getAllProfiles Error:", err.message || err);
    throw err;
  }
};

export const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (error) throw error;
  } catch (err: any) {
    console.error("updateUserRole Error:", err.message || err);
    throw err;
  }
};