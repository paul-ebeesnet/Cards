import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCards, getTransactions } from '../services/dataService';
import { StoreCard, Transaction } from '../types';

interface ChartDataPoint {
  date: string;
  amount: number; // Daily Total
  transactions: {
    id: string;
    storeName: string;
    amount: number;
  }[];
}

// --- Chart Component ---
const SpendingChart = ({ data }: { data: ChartDataPoint[] }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (data.length < 2) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 text-center">
        <h3 className="font-bold text-gray-800 mb-2 text-sm">Spending Trend</h3>
        <p className="text-xs text-gray-400">Not enough data to show trends yet.</p>
      </div>
    );
  }

  const height = 160;
  const width = 320;
  const paddingX = 40;
  const paddingY = 30;
  
  const maxVal = Math.max(...data.map(d => d.amount)) * 1.1 || 100; // Add 10% headroom
  
  // Calculate points coordinates
  const points = data.map((d, i) => {
    // Distribute points horizontally
    const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
    // Scale height (inverted because SVG 0 is top)
    const y = (height - paddingY) - (d.amount / maxVal) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  // Create SVG path strings
  const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaPath = `${linePath} L ${points[points.length-1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  const selectedPoint = points.find(p => p.date === selectedDate);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 relative">
      <h3 className="font-bold text-gray-800 mb-4 text-sm">Spending Trend (Last 7 Days)</h3>
      
      {/* Container for SVG and Overlays. Clicking background closes tooltip. */}
      <div className="w-full relative" onClick={() => setSelectedDate(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ maxHeight: '180px' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
            </filter>
          </defs>
          
          {/* Bottom Axis Line */}
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e5e7eb" strokeWidth="1" />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#chartGradient)" stroke="none" />
          
          {/* Main Line */}
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* X-Axis Labels (Date) */}
          {points.map((p, i) => (
             <text key={i} x={p.x} y={height - 10} fontSize="9" textAnchor="middle" fill="#9ca3af">
               {p.date.slice(5)} {/* Shows MM-DD */}
             </text>
          ))}

          {/* Data Points & Interactivity */}
          {points.map((p, i) => {
            const isSelected = selectedDate === p.date;
            return (
              <g 
                key={i} 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent closing immediately
                  setSelectedDate(isSelected ? null : p.date);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Visible Point */}
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={isSelected ? 6 : 3} 
                  fill={isSelected ? "#059669" : "#10b981"} 
                  stroke="white" 
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
                
                {/* Invisible Hit Target (Larger area for easier tapping) */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="15"
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>

        {/* HTML Tooltip Overlay */}
        {selectedPoint && (
          <div 
             className="absolute bg-gray-800 text-white rounded-lg shadow-xl p-3 z-10 text-xs min-w-[140px]"
             style={{
               // Position relative to the container based on percentage
               left: `${(selectedPoint.x / width) * 100}%`,
               top: `${(selectedPoint.y / height) * 100}%`,
               // Shift to center above the point, but ensure it stays on screen (flip logic could be added but simpler heuristic for now)
               transform: `translate(${selectedPoint.x > width / 2 ? '-100%' : '0%'}, -100%) translateY(-12px)`
             }}
             onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside tooltip
          >
             <div className="font-bold border-b border-gray-600 pb-2 mb-2 flex justify-between">
               <span>{selectedPoint.date}</span>
               <span className="text-emerald-400">¥{selectedPoint.amount.toLocaleString()}</span>
             </div>
             
             <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
               {selectedPoint.transactions.map((t) => (
                 <div key={t.id} className="flex justify-between gap-4">
                    <span className="truncate opacity-90 max-w-[90px]" title={t.storeName}>{t.storeName}</span>
                    <span className="font-mono">¥{t.amount}</span>
                 </div>
               ))}
             </div>

             {/* Little arrow decoration */}
             <div 
               className="absolute w-3 h-3 bg-gray-800 transform rotate-45"
               style={{
                 bottom: '-6px',
                 left: selectedPoint.x > width / 2 ? 'auto' : '10px',
                 right: selectedPoint.x > width / 2 ? '10px' : 'auto',
               }}
             ></div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2">Tap points to see details</p>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<StoreCard[]>([]);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const c = await getCards();
      const t = await getTransactions();
      
      setCards(c);
      setRecentTxns(t.slice(0, 5)); // Top 5 for list

      // Process data for Chart (Group by Date, Consumption only)
      const consumptionTxns = t.filter(txn => txn.type === 'consumption');
      const groupedData: Record<string, ChartDataPoint> = {};
      
      consumptionTxns.forEach(txn => {
        const dateKey = txn.date;
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = { date: dateKey, amount: 0, transactions: [] };
        }
        
        // Find store name for the transaction
        const card = c.find(card => card.id === txn.cardId);
        groupedData[dateKey].amount += txn.amount;
        groupedData[dateKey].transactions.push({
          id: txn.id,
          storeName: card?.storeName || 'Unknown Store',
          amount: txn.amount
        });
      });

      // Sort by date ascending and take last 7
      const sortedChartData = Object.entries(groupedData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7)
        .map(([_, data]) => data);

      setChartData(sortedChartData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalBalance = cards.reduce((sum, card) => sum + card.currentBalance, 0);

  if (loading) return <div className="flex justify-center items-center h-full text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Total Asset Card */}
      <div 
        onClick={() => navigate('/cards')}
        className="bg-gradient-to-br from-primary to-emerald-700 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-transform active:scale-95 hover:shadow-xl"
      >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm opacity-80 mb-1">Total Assets</p>
                <h2 className="text-3xl font-bold">¥ {totalBalance.toLocaleString()}</h2>
            </div>
            <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
        </div>
        <div className="mt-4 flex gap-2 text-xs opacity-90">
          <span className="bg-white/20 px-2 py-1 rounded-md">{cards.length} Cards</span>
          <span className="bg-white/20 px-2 py-1 rounded-md">Updated Today</span>
        </div>
      </div>

      {/* Spending Chart */}
      <SpendingChart data={chartData} />

      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-800">Recent Activity</h3>
          <button 
            onClick={() => navigate('/transactions')} 
            className="text-xs text-primary font-medium hover:underline flex items-center"
          >
            See All 
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
        
        {recentTxns.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl text-gray-400 text-sm">
            No transactions recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentTxns.map((txn) => {
              const card = cards.find(c => c.id === txn.cardId);
              return (
                <div key={txn.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div className="min-w-0 pr-4">
                    <p className="font-medium text-gray-800 truncate">{card?.storeName || 'Unknown Store'}</p>
                    <p className="text-xs text-gray-400">{txn.date}</p>
                    {txn.notes && (
                       <p className="text-[10px] text-gray-400 italic truncate mt-0.5">{txn.notes}</p>
                    )}
                  </div>
                  <div className={`text-right font-bold flex-shrink-0 ${txn.type === 'recharge' ? 'text-primary' : 'text-gray-800'}`}>
                    {txn.type === 'consumption' ? '-' : '+'}¥{txn.amount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};