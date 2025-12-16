import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCardById, getTransactionsByCardId, deleteCard, updateCardDetails, deleteTransaction } from '../services/dataService';
import { StoreCard, Transaction } from '../types';

export const CardDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<StoreCard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Card State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    storeName: '', 
    cardNumber: '', 
    balance: '',
    cardType: 'prepaid' as 'prepaid' | 'credit',
    expiryDate: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Transaction Delete State
  const [txnToDelete, setTxnToDelete] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [cardData, txnsData] = await Promise.all([
        getCardById(id),
        getTransactionsByCardId(id)
      ]);

      if (cardData) {
        setCard(cardData);
        setTransactions(txnsData);
        // Initialize form
        setEditForm({
            storeName: cardData.storeName,
            cardNumber: cardData.cardNumber,
            balance: cardData.currentBalance.toString(),
            cardType: cardData.cardType || 'prepaid',
            expiryDate: cardData.expiryDate || ''
        });
      } else {
        // Card not found or deleted
        navigate('/cards');
      }
    } catch (e) {
      console.error("Error loading card details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, navigate]);

  const handleUpdateCard = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!card) return;
      setIsSaving(true);
      try {
          await updateCardDetails(
              card.id, 
              editForm.storeName, 
              editForm.cardNumber, 
              parseFloat(editForm.balance),
              editForm.cardType,
              editForm.expiryDate || undefined
          );
          setIsEditing(false);
          fetchData(); // Refresh UI
      } catch (err) {
          alert("Failed to update card");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteCard = async () => {
      if (!card) return;
      if (window.confirm("Are you sure? This will delete the card and ALL associated transactions forever.")) {
          try {
              await deleteCard(card.id);
              navigate('/cards');
          } catch(err) {
              alert("Failed to delete card");
          }
      }
  };

  const handleDeleteTxn = async () => {
    if (txnToDelete) {
      try {
        await deleteTransaction(txnToDelete);
        setTxnToDelete(null);
        fetchData(); // Refresh list
      } catch (e) {
        alert("Failed to delete transaction");
      }
    }
  };

  // Generate a random gradient based on store name
  const getGradient = (name: string, isCredit: boolean = false) => {
    if (isCredit) {
        const gradients = [
            'from-gray-800 to-gray-900', 
            'from-slate-700 to-slate-900',
            'from-neutral-700 to-neutral-800',
            'from-emerald-900 to-gray-900',
            'from-blue-900 to-gray-900'
        ];
        return gradients[name.length % gradients.length];
    }
    const gradients = [
      'from-blue-500 to-blue-700',
      'from-purple-500 to-purple-700',
      'from-pink-500 to-rose-600',
      'from-orange-400 to-orange-600',
      'from-indigo-500 to-indigo-700'
    ];
    return gradients[name.length % gradients.length];
  };

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div className="flex justify-center items-center h-full text-gray-500">Loading details...</div>;
  if (!card) return null;

  const isCredit = card.cardType === 'credit';
  let expiryInfo = null;

  if (!isCredit && card.expiryDate) {
      const days = getDaysRemaining(card.expiryDate);
      let colorClass = "bg-white/20";
      let text = `${days} days left`;
      
      if (days < 0) {
        text = "Expired";
        colorClass = "bg-red-500 text-white shadow-lg";
      } else if (days <= 30) {
        colorClass = "bg-orange-500 text-white shadow-lg";
      }
      
      expiryInfo = (
        <div className="mt-3 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-lg font-bold backdrop-blur-md ${colorClass}`}>
                {text}
            </span>
            <span className="text-xs opacity-80">Valid until: {card.expiryDate}</span>
        </div>
      );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in relative">
      {/* Header / Nav */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
            onClick={() => navigate('/cards')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h2 className="text-xl font-bold text-gray-800">Wallet Details</h2>
        </div>
        
        {/* Edit Button */}
        <button 
            onClick={() => setIsEditing(true)}
            className="p-2 rounded-full bg-gray-100 hover:bg-primary hover:text-white transition-colors text-gray-600"
            title="Edit Card"
        >
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
      </div>

      {/* Card Visual */}
      <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg bg-gradient-to-r ${getGradient(card.storeName, isCredit)}`}>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-2xl">{card.storeName}</h3>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-sm opacity-80 font-mono">**** {card.cardNumber}</p>
                {isCredit && <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">Credit</span>}
            </div>
            {expiryInfo}
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80 uppercase tracking-wide">{isCredit ? 'Outstanding' : 'Current Balance'}</p>
            <p className="text-3xl font-bold mt-1">¥ {card.currentBalance.toLocaleString()}</p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
      </div>

      {/* Transactions List */}
      <div>
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>Transaction History</span>
            <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">{transactions.length}</span>
        </h3>

        {transactions.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
            No transactions found for this card.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((txn) => {
              const isRecharge = txn.type === 'recharge';
              return (
                <div key={txn.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition-colors hover:bg-gray-50">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-medium text-gray-800">{isRecharge ? 'Recharge / Top-up' : 'Consumption'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{txn.date}</p>
                    {txn.notes && (
                       <p className="text-xs text-gray-500 italic mt-1 truncate">{txn.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`font-bold ${isRecharge ? 'text-primary' : 'text-gray-800'}`}>
                      {isRecharge ? '+' : '-'}¥{txn.amount.toFixed(2)}
                    </span>
                    
                    <div className="flex gap-2">
                      <button 
                         onClick={() => navigate(`/edit/${txn.id}`)}
                         className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-500 transition-colors"
                         title="Edit Transaction"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                       </button>
                       <button 
                         onClick={() => setTxnToDelete(txn.id)}
                         className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                         title="Delete Transaction"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                       </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Card Modal */}
      {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Card Details</h3>
                  
                  <form onSubmit={handleUpdateCard} className="space-y-4">
                      {/* Card Type Switch */}
                      <div className="flex bg-gray-100 p-1 rounded-lg mb-2">
                          <button
                            type="button"
                            onClick={() => setEditForm({...editForm, cardType: 'prepaid'})}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${editForm.cardType === 'prepaid' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                          >
                            Prepaid / Store
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({...editForm, cardType: 'credit'})}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${editForm.cardType === 'credit' ? 'bg-gray-800 shadow text-white' : 'text-gray-500'}`}
                          >
                            Credit Card
                          </button>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Store Name</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={editForm.storeName}
                            onChange={e => setEditForm({...editForm, storeName: e.target.value})}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Last 4</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={editForm.cardNumber}
                            onChange={e => setEditForm({...editForm, cardNumber: e.target.value})}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                              {editForm.cardType === 'credit' ? 'Current Outstanding' : 'Current Balance'}
                          </label>
                          <input 
                            type="number" 
                            step="0.01"
                            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50"
                            value={editForm.balance}
                            onChange={e => setEditForm({...editForm, balance: e.target.value})}
                            required
                          />
                          <p className="text-[10px] text-gray-400 mt-1">Manual correction does not affect transaction history.</p>
                      </div>

                      {editForm.cardType === 'prepaid' && (
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                           <input 
                             type="date"
                             className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50"
                             value={editForm.expiryDate}
                             onChange={e => setEditForm({...editForm, expiryDate: e.target.value})}
                           />
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                          <button 
                            type="button" 
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-2 text-gray-600 font-bold bg-gray-100 rounded-lg hover:bg-gray-200"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={isSaving}
                            className="flex-1 py-2 text-white font-bold bg-primary rounded-lg hover:bg-emerald-600"
                          >
                              {isSaving ? 'Saving...' : 'Save'}
                          </button>
                      </div>
                  </form>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                      <button 
                        type="button" 
                        onClick={handleDeleteCard}
                        className="w-full py-3 text-red-600 text-sm font-bold bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          Delete This Card
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Transaction Modal */}
      {txnToDelete && (
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
                      This will remove this record from history. The card balance will NOT be automatically reverted.
                  </p>
              </div>
              <div className="bg-gray-50 px-4 py-3 flex gap-3">
                  <button
                      type="button"
                      onClick={() => setTxnToDelete(null)}
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                  >
                      Cancel
                  </button>
                  <button
                      type="button"
                      onClick={handleDeleteTxn}
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
