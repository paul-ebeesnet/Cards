import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCards } from '../services/dataService';
import { StoreCard } from '../types';

export const Cards: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<StoreCard[]>([]);

  useEffect(() => {
    getCards().then(setCards);
  }, []);

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

  const prepaidCards = cards.filter(c => c.cardType !== 'credit');
  const creditCards = cards.filter(c => c.cardType === 'credit');

  const CardItem: React.FC<{ card: StoreCard; isCredit: boolean }> = ({ card, isCredit }) => (
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

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold text-gray-800">My Wallets</h2>
      
      {cards.length === 0 && (
        <div className="text-center mt-10 text-gray-500">
            <p>No cards added.</p>
            <p className="text-sm">Use the (+) button to add your first consumption.</p>
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
    </div>
  );
};