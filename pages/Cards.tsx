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

  // Generate a random gradient based on store name to make it look distinct
  const getGradient = (name: string) => {
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">My Wallets</h2>
      
      {cards.length === 0 ? (
        <div className="text-center mt-10 text-gray-500">
            <p>No cards added.</p>
            <p className="text-sm">Use the (+) button to add your first consumption.</p>
        </div>
      ) : (
        cards.map((card) => (
          <div 
            key={card.id} 
            onClick={() => navigate(`/cards/${card.id}`)}
            className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-md bg-gradient-to-r ${getGradient(card.storeName)} cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}
          >
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{card.storeName}</h3>
                <p className="text-xs opacity-80 mt-1">**** **** **** {card.cardNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Balance</p>
                <p className="text-2xl font-bold">¥ {card.currentBalance}</p>
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute top-0 right-1/2 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
          </div>
        ))
      )}
    </div>
  );
};