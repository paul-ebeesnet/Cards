import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, getCards, deleteTransaction } from '../services/dataService';
import { Transaction, StoreCard } from '../types';

export const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<StoreCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'consumption' | 'recharge'>('all');
  const [filterStore, setFilterStore] = useState<string>('all');

  // Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    // Fetch both transactions and cards to resolve store names
    const [t, c] = await Promise.all([getTransactions(), getCards()]);
    setTransactions(t);
    setCards(c);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const initiateDelete = (id: string) => {
    setDeleteId(id);
  };

  const performDelete = async () => {
    if (deleteId) {
      await deleteTransaction(deleteId);
      setDeleteId(null);
      loadData(); // Refresh list
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/edit/${id}`);
  };

  // Extract unique store names for the filter dropdown
  const storeNames = Array.from(new Set(cards.map(c => c.storeName))).sort();

  // Apply filters
  const filteredTransactions = transactions.filter(txn => {
    const card = cards.find(c => c.id === txn.cardId);
    
    // 1. Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const storeName = (card?.storeName || '').toLowerCase();
      const rawText = (txn.rawText || '').toLowerCase();
      
      // Match against store name or raw parsed text
      if (!storeName.includes(query) && !rawText.includes(query)) {
        return false;
      }
    }

    // 2. Filter by Type
    if (filterType !== 'all' && txn.type !== filterType) return false;

    // 3. Filter by Store Dropdown
    if (filterStore !== 'all') {
      // Filter if card not found or name doesn't match
      if (!card || card.storeName !== filterStore) return false;
    }

    return true;
  });

  if (loading) {
    return (
        <div className="flex flex-col justify-center items-center h-[60vh] text-gray-400">
            <svg className="animate-spin h-8 w-8 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-medium">Loading history...</p>
        </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-20 relative">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-800">History</h2>
        <span className="text-xs text-gray-400">{filteredTransactions.length} records</span>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-3 sticky top-0 z-10">
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary sm:text-sm transition-colors"
            placeholder="Search store or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type Segmented Control */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              filterType === 'all' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('consumption')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              filterType === 'consumption' ? 'bg-white shadow text-red-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Spent
          </button>
          <button
            onClick={() => setFilterType('recharge')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              filterType === 'recharge' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Top-up
          </button>
        </div>

        {/* Store Dropdown */}
        <div className="relative">
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="w-full text-sm p-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white appearance-none"
          >
            <option value="all">All Stores</option>
            {storeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {/* Custom Arrow Icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl text-gray-400 border border-dashed border-gray-200">
          <p>No transactions match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((txn) => {
            const card = cards.find(c => c.id === txn.cardId);
            const isRecharge = txn.type === 'recharge';
            
            return (
              <div key={txn.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition-colors hover:bg-gray-50">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-medium text-gray-800 truncate">{card?.storeName || 'Unknown Store'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{txn.date}</p>
                  {txn.rawText && (
                    <p className="text-[10px] text-gray-300 truncate mt-1">AI Parsed</p>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right whitespace-nowrap">
                    <span className={`block font-bold text-lg ${isRecharge ? 'text-primary' : 'text-gray-800'}`}>
                      {isRecharge ? '+' : '-'}¥{txn.amount.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleEdit(txn.id); }}
                       className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-500 transition-colors"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); initiateDelete(txn.id); }}
                       className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                     </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border border-gray-100">
              <div className="p-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Transaction?</h3>
                  <p className="text-sm text-gray-500 mt-2">
                      Are you sure you want to remove this record? This action cannot be undone.
                  </p>
              </div>
              <div className="bg-gray-50 px-4 py-3 flex gap-3">
                  <button
                      type="button"
                      onClick={() => setDeleteId(null)}
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                  >
                      Cancel
                  </button>
                  <button
                      type="button"
                      onClick={performDelete}
                      className="flex-1 rounded-xl border border-transparent bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 focus:outline-none shadow-lg shadow-red-200 transition-colors"
                  >
                      Delete
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};