import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { parseTransactionText } from '../services/geminiService';
import { saveCard, addTransaction, getCards, getTransactionById, getCardById, updateTransaction } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { StoreCard, Transaction, ParsedTransactionData } from '../types';

export const AddEntry: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Check if we are in edit mode
  const isEditMode = !!id;

  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Available cards for auto-complete
  const [availableCards, setAvailableCards] = useState<StoreCard[]>([]);
  
  // Single Entry State
  const [formData, setFormData] = useState({
    storeName: '',
    cardNumber: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    balance: '',
    type: 'consumption' as 'consumption' | 'recharge',
    cardType: 'prepaid' as 'prepaid' | 'credit' // New Field
  });

  // Bulk Entry State
  const [bulkData, setBulkData] = useState<ParsedTransactionData[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false); // Controls Manual/Single view
  const [showBulkConfirmation, setShowBulkConfirmation] = useState(false); // Controls Bulk view

  const [originalTxn, setOriginalTxn] = useState<Transaction | null>(null);

  // Load Cards on Mount
  useEffect(() => {
    getCards().then(setAvailableCards);
  }, []);

  // Load data if in Edit Mode
  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      const loadTxn = async () => {
        const txn = await getTransactionById(id);
        if (txn) {
          setOriginalTxn(txn);
          const card = await getCardById(txn.cardId);
          setFormData({
            storeName: card?.storeName || '',
            cardNumber: card?.cardNumber || '',
            date: txn.date,
            amount: txn.amount.toString(),
            // In edit mode, show the transaction's recorded balance, or the card's current if missing
            balance: (txn.balanceAfter || card?.currentBalance || 0).toString(),
            type: txn.type,
            cardType: card?.cardType || 'prepaid'
          });
          setActiveTab('manual'); // Force manual tab
        } else {
          alert('Transaction not found');
          navigate('/transactions');
        }
        setIsLoading(false);
      };
      loadTxn();
    }
  }, [id, isEditMode, navigate]);

  const handleAIParse = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const results = await parseTransactionText(inputText);
      
      if (results && results.length > 0) {
        if (results.length === 1) {
          // Single Result - Populate Form
          const result = results[0];
          
          // Auto-detect existing card type if possible
          const existingCard = availableCards.find(c => c.storeName === result.storeName && c.cardNumber === result.cardNumber);
          
          setFormData({
            storeName: result.storeName,
            cardNumber: result.cardNumber,
            date: result.transactionDate,
            amount: result.amount.toString(),
            balance: result.balanceAfter.toString(),
            type: result.type,
            cardType: existingCard ? (existingCard.cardType || 'prepaid') : (result.suggestedCardType || 'prepaid')
          });
          setShowConfirmation(true);
          setShowBulkConfirmation(false);
        } else {
          // Multiple Results - Show Bulk UI
          // Sort by date ascending
          const sorted = [...results].sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
          setBulkData(sorted);
          setShowBulkConfirmation(true);
          setShowConfirmation(false);
        }
      } else {
        alert("Could not parse the text. Please try manual entry.");
      }
    } catch (e) {
      alert("AI Service Error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkSubmit = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to add transactions");
      const userId = user.id;

      const allCards = await getCards();

      // Group by Card
      const groups: Record<string, ParsedTransactionData[]> = {};
      
      bulkData.forEach(item => {
        const key = `${item.storeName}-${item.cardNumber}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      for (const key in groups) {
        const items = groups[key];
        const firstItem = items[0];
        let targetCard = allCards.find(
          c => c.storeName === firstItem.storeName && c.cardNumber === firstItem.cardNumber
        );

        // Find the "Latest" item by date to determine initial balance for NEW cards
        const latestItem = [...items].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0];

        if (!targetCard) {
          // CRITICAL FIX: Do not pass 'id' here. Let saveCard/Supabase generate the valid UUID.
          const newCardPayload: Partial<StoreCard> = {
            userId,
            storeName: firstItem.storeName,
            cardNumber: firstItem.cardNumber,
            currentBalance: latestItem.balanceAfter, // For Credit Cards from statements, this might be 0 or current outstanding
            cardType: firstItem.suggestedCardType || 'prepaid',
            lastUpdated: new Date().toISOString()
          };
          // CAPTURE the return value which contains the real DB ID
          targetCard = await saveCard(newCardPayload);
        }

        for (const item of items) {
          // CRITICAL FIX: Do not pass 'id' here either. Let DB generate UUID.
          const newTxn: Transaction = {
            id: undefined as any, // ID generated by DB
            cardId: targetCard.id, // Use valid UUID from DB
            userId,
            amount: item.amount,
            balanceAfter: item.balanceAfter, // Save snapshot
            date: item.transactionDate,
            type: item.type,
            rawText: `Bulk Import: ${item.storeName}`
          };
          await addTransaction(newTxn);
        }
      }

      navigate('/');
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save bulk data: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to add transactions");
      const userId = user.id;

      const allCards = await getCards();
      let targetCard = allCards.find(
        c => c.storeName === formData.storeName && c.cardNumber === formData.cardNumber
      );

      if (isEditMode && originalTxn) {
        // --- UPDATE EXISTING ---
        const updatedTxn: Transaction = {
          ...originalTxn,
          amount: parseFloat(formData.amount),
          balanceAfter: parseFloat(formData.balance),
          date: formData.date,
          type: formData.type,
        };
        await updateTransaction(updatedTxn);
        
      } else {
        // --- CREATE NEW ---
        if (!targetCard) {
          // CRITICAL FIX: Do not pass 'id'. Let saveCard generate the valid UUID.
          const newCardPayload: Partial<StoreCard> = {
            userId,
            storeName: formData.storeName,
            cardNumber: formData.cardNumber,
            currentBalance: parseFloat(formData.balance),
            cardType: formData.cardType, // Save Type
            lastUpdated: new Date().toISOString()
          };
          // CAPTURE the result which contains the valid UUID
          targetCard = await saveCard(newCardPayload);
        } else {
            // Update Existing Card Type if not set? Maybe not implicitly.
            // But we might want to ensure type matches for consistency?
            // For now, let's just use the existing card.
        }

        const newTxn: Transaction = {
          id: undefined as any, // Generated by DB
          cardId: targetCard.id, // Use valid UUID
          userId,
          amount: parseFloat(formData.amount),
          balanceAfter: parseFloat(formData.balance),
          date: formData.date,
          type: formData.type,
          rawText: activeTab === 'ai' ? inputText : undefined
        };
        await addTransaction(newTxn);
      }

      navigate(isEditMode ? '/transactions' : '/');
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save data: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if current card is known
  const isKnownCard = availableCards.some(c => c.storeName === formData.storeName && c.cardNumber === formData.cardNumber);

  if (isLoading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="pb-10">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{isEditMode ? 'Edit Transaction' : 'Add Record'}</h2>

      {/* Tabs */}
      {!isEditMode && !showBulkConfirmation && (
        <div className="flex bg-gray-200 p-1 rounded-lg mb-6">
          <button
            onClick={() => { setActiveTab('ai'); setShowConfirmation(false); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'ai' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
          >
            ✨ AI Paste
          </button>
          <button
            onClick={() => { setActiveTab('manual'); setShowConfirmation(true); setFormData({ ...formData, storeName: '' }); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'manual' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
          >
            Manual Input
          </button>
        </div>
      )}

      {/* AI Input Area */}
      {activeTab === 'ai' && !showConfirmation && !showBulkConfirmation && !isEditMode && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
            <strong>Supports Credit Card Statements!</strong>
            <p className="mt-1 opacity-80">Copy the text from your bank's SMS, Email, or App monthly statement. The AI Webhook will extract dates, amounts, and merchants automatically.</p>
          </div>
          <textarea
            className="w-full h-40 p-4 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-0 resize-none transition-colors font-mono text-sm"
            placeholder={`Paste here...\n\nExample:\n10/01 Starbucks $5.00\n10/02 Uber $15.50\nTotal Due: $20.50`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>
          <button
            onClick={handleAIParse}
            disabled={isProcessing || !inputText}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex justify-center items-center ${isProcessing || !inputText ? 'bg-gray-400' : 'bg-primary hover:bg-emerald-600'}`}
          >
            {isProcessing ? 'Analyzing with AI...' : 'Analyze Text'}
          </button>
        </div>
      )}

      {/* BULK CONFIRMATION VIEW */}
      {showBulkConfirmation && (
        <div className="animate-fade-in space-y-4">
           <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-sm text-emerald-800">
             <strong>Found {bulkData.length} transactions.</strong>
             <p className="mt-1">Items are sorted by date. Cards will be created or updated automatically.</p>
           </div>
           
           <div className="space-y-3">
             {bulkData.map((item, index) => (
               <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                  <div className="flex justify-between items-start border-b border-gray-50 pb-2">
                     <div>
                       <span className="font-bold text-gray-800 block">{item.storeName}</span>
                       <span className="text-xs text-gray-400">Card: {item.cardNumber}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-xs text-gray-400 block">{item.transactionDate}</span>
                        <span className={`font-bold ${item.type === 'recharge' ? 'text-primary' : 'text-gray-800'}`}>
                           {item.type === 'recharge' ? '+' : '-'}¥{item.amount}
                        </span>
                     </div>
                  </div>
                  {item.suggestedCardType === 'credit' && (
                     <div className="flex justify-between items-center text-xs">
                         <span className="bg-gray-800 text-white px-2 py-0.5 rounded">Credit Card Detected</span>
                     </div>
                  )}
               </div>
             ))}
           </div>

           <div className="pt-4 flex gap-3">
             <button
               type="button"
               onClick={() => setShowBulkConfirmation(false)}
               className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold"
             >
               Back
             </button>
             <button
               onClick={handleBulkSubmit}
               disabled={isProcessing}
               className="flex-1 py-3 rounded-xl bg-primary hover:bg-emerald-600 text-white font-bold shadow-lg"
             >
               {isProcessing ? 'Saving All...' : `Save ${bulkData.length} Records`}
             </button>
           </div>
        </div>
      )}

      {/* SINGLE FORM (Manual / Edited / AI Single) */}
      {(showConfirmation || activeTab === 'manual') && !showBulkConfirmation && (
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Store / Bank Name</label>
            <input
              type="text"
              required
              disabled={isEditMode}
              className={`w-full p-3 rounded-lg border border-gray-200 focus:border-primary outline-none ${isEditMode ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}`}
              value={formData.storeName}
              onChange={(e) => {
                  setFormData({ ...formData, storeName: e.target.value });
                  // Auto-fill card number if known store
                  const known = availableCards.find(c => c.storeName === e.target.value);
                  if (known) {
                      setFormData(prev => ({...prev, cardNumber: known.cardNumber, cardType: known.cardType || 'prepaid'}));
                  }
              }}
              list="store-suggestions"
              placeholder="e.g. Starbucks or Chase Bank"
            />
            {/* Auto-complete datalist */}
            <datalist id="store-suggestions">
                {Array.from(new Set(availableCards.map(c => c.storeName))).map((name, i) => (
                    <option key={i} value={name} />
                ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Card Last 4</label>
              <input
                type="text"
                required
                placeholder="8888"
                disabled={isEditMode}
                className={`w-full p-3 rounded-lg border border-gray-200 focus:border-primary outline-none ${isEditMode ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}`}
                value={formData.cardNumber}
                onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Date</label>
              <input
                type="date"
                required
                className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary outline-none bg-white text-gray-900"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Type</label>
              <select
                className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary outline-none bg-white text-gray-900"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="consumption">Consumption (-)</option>
                <option value="recharge">Recharge / Income (+)</option>
              </select>
            </div>
             <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary outline-none bg-white text-gray-900"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          {/* New Card Type Selector (Only if card is new or manual mode) */}
          {!isKnownCard && !isEditMode && (
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Type</label>
                   <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, cardType: 'prepaid'})}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${formData.cardType === 'prepaid' ? 'bg-white shadow text-primary' : 'text-gray-400'}`}
                      >
                        Prepaid / Store Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, cardType: 'credit'})}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${formData.cardType === 'credit' ? 'bg-gray-800 shadow text-white' : 'text-gray-400'}`}
                      >
                        Credit Card
                      </button>
                   </div>
              </div>
          )}

          <div>
             <div className="flex justify-between mb-1">
                <label className="block text-xs font-bold text-gray-500 uppercase">
                    {formData.cardType === 'credit' ? 'Outstanding Balance (Total Due)' : 'New Balance'}
                </label>
             </div>
             <input
                type="number"
                step="0.01"
                required
                className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary outline-none bg-white text-gray-900"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
             />
             <p className="text-[10px] text-gray-400 mt-1">
                This balance will be saved with the transaction record.
             </p>
          </div>

          <div className="flex gap-3 pt-4">
             <button
               type="button"
               onClick={() => navigate(isEditMode ? '/transactions' : '/')}
               className="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50"
             >
               Back
             </button>
             <button
               type="submit"
               disabled={isProcessing}
               className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-emerald-600 text-white font-bold shadow-lg"
             >
               {isProcessing ? 'Saving...' : (isEditMode ? 'Update Transaction' : 'Confirm & Save')}
             </button>
          </div>
        </form>
      )}
    </div>
  );
};