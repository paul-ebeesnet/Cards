import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCards, saveCard } from '../services/dataService';
import { StoreCard } from '../types';
import { supabase } from '../services/supabaseClient';

export const Cards: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<StoreCard[]>([]);
  
  // Add Card Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    storeName: '',
    cardNumber: '',
    initialBalance: '',
    cardType: 'prepaid' as 'prepaid' | 'credit',
    expiryDate: ''
  });

  const loadCards = () => {
    getCards().then(setCards);
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        await saveCard({
            storeName: newCardForm.storeName,
            cardNumber: newCardForm.cardNumber,
            currentBalance: parseFloat(newCardForm.initialBalance) || 0,
            cardType: newCardForm.cardType,
            expiryDate: newCardForm.expiryDate || undefined,
            userId: user.id
        });

        setIsAdding(false);
        setNewCardForm({ storeName: '', cardNumber: '', initialBalance: '', cardType: 'prepaid', expiryDate: '' });
        loadCards(); // Refresh list
    } catch (err: any) {
        alert("Failed to add card: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  // Prepaid gradients
  const getPrepaidGradient = (name: string) => {
    const gradients = [
      'from-blue-500 to-blue-700',
      'from-purple-500 to-purple-700',
      'from-pink-500 to-rose-600',
      'from-orange-400 to-orange-600',
      'from-indigo-500 to-indigo-700'
    ];
    const index = name.length % gradients.length;
    return gradients[index];
  };

  // Credit Card gradients (Darker / Premium look)
  const getCreditGradient = (name: string) => {
    const gradients = [
        'from-gray-800 to-gray-900', // Black
        'from-slate-700 to-slate-900', // Slate
        'from-neutral-700 to-neutral-800', // Neutral
        'from-emerald-900 to-gray-900', // Dark Green
        'from-blue-900 to-gray-900'  // Dark Blue
    ];
    const index = name.length % gradients.length;
    return gradients[index];
  };

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days;
  };

  const prepaidCards = cards.filter(c => c.cardType !== 'credit');
  const creditCards = cards.filter(c => c.cardType === 'credit');

  const CardItem: React.FC<{ card: StoreCard; isCredit: boolean }> = ({ card, isCredit }) => {
    let daysLeft = null;
    let expiryStatusColor = 'bg-white/20';
    let statusText = '';
    
    if (!isCredit && card.expiryDate) {
        daysLeft = getDaysRemaining(card.expiryDate);
        if (daysLeft < 0) {
            statusText = 'Expired';
            expiryStatusColor = 'bg-red-500 text-white';
        } else if (daysLeft <= 30) {
            statusText = `${daysLeft} days left`;
            expiryStatusColor = 'bg-orange-500 text-white';
        } else {
            statusText = `${daysLeft} days left`;
        }
    }

    return (
    <div 
        onClick={() => navigate(`/cards/${card.id}`)}
        className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-md bg-gradient-to-r ${isCredit ? getCreditGradient(card.storeName) : getPrepaidGradient(card.storeName)} cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}
    >
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <h3 className="font-bold text-lg">{card.storeName}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs opacity-80 font-mono">**** {card.cardNumber}</p>
                    {isCredit && <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">Credit</span>}
                </div>
                
                {!isCredit && card.expiryDate && (
                    <div className="mt-3 flex items-center gap-2">
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm ${expiryStatusColor}`}>
                             {statusText}
                         </span>
                         <span className="text-[10px] opacity-70">Exp: {card.expiryDate}</span>
                    </div>
                )}
            </div>
            <div className="text-right">
                <p className="text-xs opacity-80">{isCredit ? 'Outstanding' : 'Balance'}</p>
                <p className="text-2xl font-bold">¥ {card.currentBalance.toLocaleString()}</p>
            </div>
        </div>
        
        {/* Decorative circles */}
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute top-0 right-1/2 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
        {isCredit && <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>}
    </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in relative">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">My Wallets</h2>
        <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow hover:bg-black transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            Add Card
        </button>
      </div>
      
      {cards.length === 0 && (
        <div className="text-center mt-10 text-gray-500">
            <p>No cards added.</p>
            <p className="text-sm">Use the (+) button to add your first consumption or card.</p>
        </div>
      )}

      {/* Credit Cards Section */}
      {creditCards.length > 0 && (
          <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Credit Cards</h3>
              {creditCards.map(card => <CardItem key={card.id} card={card} isCredit={true} />)}
          </div>
      )}

      {/* Prepaid Cards Section */}
      {prepaidCards.length > 0 && (
          <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Store / Prepaid Cards</h3>
              {prepaidCards.map(card => <CardItem key={card.id} card={card} isCredit={false} />)}
          </div>
      )}

      {/* Add Card Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Card</h3>
                  
                  <form onSubmit={handleAddCard} className="space-y-4">
                      {/* Card Type Selector */}
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setNewCardForm({...newCardForm, cardType: 'prepaid'})}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newCardForm.cardType === 'prepaid' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                          >
                            Prepaid / Store
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewCardForm({...newCardForm, cardType: 'credit'})}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newCardForm.cardType === 'credit' ? 'bg-gray-800 shadow text-white' : 'text-gray-500'}`}
                          >
                            Credit Card
                          </button>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                              {newCardForm.cardType === 'credit' ? 'Bank Name' : 'Store Name'}
                          </label>
                          <input 
                            type="text" 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary outline-none"
                            placeholder={newCardForm.cardType === 'credit' ? "e.g. Chase Sapphire" : "e.g. Starbucks"}
                            value={newCardForm.storeName}
                            onChange={e => setNewCardForm({...newCardForm, storeName: e.target.value})}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last 4 Digits</label>
                          <input 
                            type="text" 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary outline-none"
                            placeholder="8888"
                            value={newCardForm.cardNumber}
                            onChange={e => setNewCardForm({...newCardForm, cardNumber: e.target.value})}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                              {newCardForm.cardType === 'credit' ? 'Current Outstanding' : 'Current Balance'}
                          </label>
                          <input 
                            type="number" 
                            step="0.01"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary outline-none"
                            placeholder="0.00"
                            value={newCardForm.initialBalance}
                            onChange={e => setNewCardForm({...newCardForm, initialBalance: e.target.value})}
                          />
                      </div>

                      {newCardForm.cardType === 'prepaid' && (
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date (Optional)</label>
                           <input 
                             type="date"
                             className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary outline-none"
                             value={newCardForm.expiryDate}
                             onChange={e => setNewCardForm({...newCardForm, expiryDate: e.target.value})}
                           />
                        </div>
                      )}

                      <div className="flex gap-3 mt-6">
                          <button 
                            type="button" 
                            onClick={() => setIsAdding(false)}
                            className="flex-1 py-3 text-gray-600 font-bold bg-gray-50 rounded-xl hover:bg-gray-100"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={isSaving}
                            className="flex-1 py-3 text-white font-bold bg-primary rounded-xl hover:bg-emerald-600 shadow-lg"
                          >
                              {isSaving ? 'Creating...' : 'Create Card'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
