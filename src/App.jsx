import React, { useEffect, useState } from 'react';
import { Leaf, Wind, TrendingUp, Activity, AlertTriangle, Trees } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Google Gemini API integration for carbon data
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const askGemini = async (prompt) => {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const parseJson = (text) => {
  // Try to extract JSON from markdown code block first
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to other methods
    }
  }
  
  // Try to find array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // Continue to object match
    }
  }
  
  // Try to find object
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
  
  return null;
};

const apiService = {
  fetchEmissionFactors: async (city) => {
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    
    // Dynamic fallback with slight daily variation
    const dayVar = (today.getDate() % 10) / 100; // 0 to 0.09 variation
    const fallback = { 
      energy: parseFloat((0.85 + dayVar).toFixed(2)), 
      transport: parseFloat((2.25 + dayVar * 2).toFixed(2)), 
      waste: parseFloat((1.4 + dayVar).toFixed(2)) 
    };
    
    if (!API_KEY) return fallback;

    try {
      const prompt = `For ${city}, Nepal as of ${month} ${year}, provide current CO2 emission factors.
Consider current grid mix, fuel quality, and local conditions.
Return ONLY JSON: {"energy": <kg CO2e per kWh>, "transport": <kg CO2e per liter petrol>, "waste": <kg CO2e per kg waste>}`;
      const text = await askGemini(prompt);
      const parsed = parseJson(text);
      if (parsed && parsed.energy && parsed.transport && parsed.waste) return parsed;
      return fallback;
    } catch (err) {
      console.warn('Gemini emission factors failed, using fallback', err);
      return fallback;
    }
  },

  fetchAverageUsage: async (city) => {
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    const season = today.getMonth() >= 10 || today.getMonth() <= 1 ? 'winter (higher heating needs)' : 
                   today.getMonth() >= 5 && today.getMonth() <= 8 ? 'monsoon season' : 'spring/autumn';
    
    // Dynamic fallback based on current date to simulate variation
    const dayVariation = today.getDate() / 31; // 0 to 1 based on day of month
    const baseFallback = {
      Kathmandu: { energy: 140 + Math.round(dayVariation * 30), transport: 50 + Math.round(dayVariation * 15), waste: 28 + Math.round(dayVariation * 8) },
      Bhaktapur: { energy: 85 + Math.round(dayVariation * 25), transport: 30 + Math.round(dayVariation * 12), waste: 18 + Math.round(dayVariation * 7) },
      Lalitpur: { energy: 120 + Math.round(dayVariation * 28), transport: 42 + Math.round(dayVariation * 14), waste: 24 + Math.round(dayVariation * 8) },
    };
    const fallback = baseFallback[city] || { energy: 120, transport: 45, waste: 25 };
    
    if (!API_KEY) {
      console.log('No API key, using dynamic fallback for', city, 'on', today.toDateString(), fallback);
      return fallback;
    }

    try {
      const prompt = `You are providing real-time carbon footprint data for ${city}, Nepal.
Today is ${month} ${today.getDate()}, ${year} (${season}).

Consider current factors:
- Season: ${season} affects electricity (heating/cooling) and transport patterns
- Day of week: ${today.toLocaleString('en-US', { weekday: 'long' })} affects commuting
- ${city === 'Kathmandu' ? 'Kathmandu: Capital city, heavy traffic, higher energy demand, more commercial activity' : ''}
- ${city === 'Bhaktapur' ? 'Bhaktapur: Heritage town, lower vehicle density, traditional lifestyle, less industrial activity' : ''}
- ${city === 'Lalitpur' ? 'Lalitpur: Growing urban center, mix of residential and commercial, moderate traffic' : ''}

Provide CURRENT average monthly household consumption values that reflect today's conditions.
Values should vary realistically day-to-day and season-to-season.

Return ONLY this JSON (numbers only, no units):
{"energy": <kWh 70-200>, "transport": <liters 15-80>, "waste": <kg 12-45>}`;
      
      const text = await askGemini(prompt);
      console.log('Gemini dynamic usage for', city, 'on', today.toDateString(), ':', text);
      const parsed = parseJson(text);
      console.log('Parsed dynamic usage:', parsed);
      
      if (parsed && typeof parsed.energy === 'number' && typeof parsed.transport === 'number' && typeof parsed.waste === 'number') {
        return parsed;
      }
      if (parsed && parsed.energy && parsed.transport && parsed.waste) {
        return {
          energy: parseFloat(parsed.energy) || fallback.energy,
          transport: parseFloat(parsed.transport) || fallback.transport,
          waste: parseFloat(parsed.waste) || fallback.waste,
        };
      }
      console.log('Parsed data invalid, using dynamic fallback');
      return fallback;
    } catch (err) {
      console.warn('Gemini request failed, using dynamic fallback', err);
      return fallback;
    }
  },

  fetchHistoricalData: async (city) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Dynamic fallback with variation based on current date
    const dayVar = today.getDate();
    const baseValues = {
      Kathmandu: [408 + dayVar % 5, 414 + dayVar % 6, 420 + dayVar % 7, 427 + dayVar % 8, 433 + dayVar % 9],
      Bhaktapur: [378 + dayVar % 4, 383 + dayVar % 5, 388 + dayVar % 6, 391 + dayVar % 7, 396 + dayVar % 8],
      Lalitpur: [393 + dayVar % 5, 399 + dayVar % 6, 406 + dayVar % 7, 411 + dayVar % 8, 418 + dayVar % 9],
    };
    const fallback = () => (baseValues[city] || baseValues.Kathmandu).map((val, i) => ({ year: 2020 + i, index: val }));

    if (!API_KEY) return fallback();

    try {
      const prompt = `For ${city}, Nepal, provide estimated annual carbon index (CO2 ppm equivalent) from 2020 to 2024.
Consider real trends: population growth, vehicle increase, energy demand, and any environmental policies.
Today is ${today.toDateString()} - provide current best estimates.
Return ONLY JSON array: [{"year": 2020, "index": <number>}, {"year": 2021, "index": <number>}, ...]`;
      const text = await askGemini(prompt);
      const parsed = parseJson(text);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].year) return parsed;
      return fallback();
    } catch (err) {
      console.warn('Gemini historical data failed, using fallback', err);
      return fallback();
    }
  },

  fetchIndexingData: async (city) => {
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    const quarter = Math.ceil((today.getMonth() + 1) / 3);
    
    const colors = ['#10b981', '#34d399', '#22c55e', '#059669'];
    
    // Dynamic fallback based on current date
    const dayVar = today.getDate();
    const dynamicProfiles = {
      Kathmandu: {
        summary: { current: 448 + dayVar % 10, target: 320, trend: -5.0 - (dayVar % 3) * 0.2, status: dayVar % 5 > 2 ? 'Improving' : 'Stable' },
        sectors: [
          { name: 'Transportation', value: 30 + dayVar % 5 },
          { name: 'Energy', value: 34 + dayVar % 4 },
          { name: 'Industry', value: 17 + dayVar % 3 },
          { name: 'Agriculture', value: 100 - (30 + dayVar % 5) - (34 + dayVar % 4) - (17 + dayVar % 3) },
        ],
        details: `Q${quarter} ${year}: Traffic emissions ${dayVar % 2 === 0 ? 'slightly up' : 'stable'}. Grid stability ${dayVar % 3 === 0 ? 'improved' : 'fluctuating'}.`,
      },
      Bhaktapur: {
        summary: { current: 394 + dayVar % 8, target: 300, trend: -3.8 - (dayVar % 4) * 0.15, status: dayVar % 4 > 1 ? 'Improving' : 'Stable' },
        sectors: [
          { name: 'Transportation', value: 26 + dayVar % 4 },
          { name: 'Energy', value: 29 + dayVar % 3 },
          { name: 'Industry', value: 19 + dayVar % 3 },
          { name: 'Agriculture', value: 100 - (26 + dayVar % 4) - (29 + dayVar % 3) - (19 + dayVar % 3) },
        ],
        details: `Q${quarter} ${year}: Heritage zone traffic restrictions ${dayVar % 2 === 0 ? 'helping reduce' : 'maintaining'} emissions.`,
      },
      Lalitpur: {
        summary: { current: 416 + dayVar % 9, target: 310, trend: -4.5 - (dayVar % 3) * 0.18, status: dayVar % 3 > 0 ? 'Improving' : 'Stable' },
        sectors: [
          { name: 'Transportation', value: 28 + dayVar % 4 },
          { name: 'Energy', value: 33 + dayVar % 4 },
          { name: 'Industry', value: 18 + dayVar % 3 },
          { name: 'Agriculture', value: 100 - (28 + dayVar % 4) - (33 + dayVar % 4) - (18 + dayVar % 3) },
        ],
        details: `Q${quarter} ${year}: Construction activity ${dayVar % 2 === 0 ? 'elevated' : 'moderate'}. Solar adoption growing.`,
      },
    };

    const fallback = () => {
      const p = dynamicProfiles[city] || dynamicProfiles.Kathmandu;
      return { ...p, sectors: p.sectors.map((s, i) => ({ ...s, color: colors[i % colors.length] })) };
    };

    if (!API_KEY) return fallback();

    try {
      const prompt = `For ${city}, Nepal as of ${month} ${today.getDate()}, ${year} (Q${quarter}):
Provide CURRENT carbon indexing data reflecting today's conditions.

Consider:
- Current season and its effect on energy use
- Recent traffic patterns
- Any ongoing environmental initiatives
- Day-to-day variations in activity levels

Return ONLY this JSON:
{
  "summary": {"current": <current CO2 index 380-470 ppm>, "target": <target ppm>, "trend": <% change negative if improving>, "status": "Improving" or "Stable" or "Worsening"},
  "sectors": [{"name": "Transportation", "value": <%>}, {"name": "Energy", "value": <%>}, {"name": "Industry", "value": <%>}, {"name": "Agriculture", "value": <%>}],
  "details": "<1 sentence about current Q${quarter} ${year} carbon situation>"
}
Sector values must sum to 100.`;
      const text = await askGemini(prompt);
      const parsed = parseJson(text);
      if (parsed && parsed.summary && parsed.sectors) {
        return { ...parsed, sectors: parsed.sectors.map((s, i) => ({ ...s, color: colors[i % colors.length] })) };
      }
      return fallback();
    } catch (err) {
      console.warn('Gemini indexing data failed, using fallback', err);
      return fallback();
    }
  },
};

const GreenCompass = () => {
  const [activeTab, setActiveTab] = useState('indexing');
  const [selectedCity, setSelectedCity] = useState('Kathmandu');
  const [inputs, setInputs] = useState({ energy: '', transport: '', waste: '' });
  const [factors, setFactors] = useState(null);
  const [currentFootprint, setCurrentFootprint] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [growthRate, setGrowthRate] = useState(0);
  const [treesRequired, setTreesRequired] = useState(0);
  const [indexingSummary, setIndexingSummary] = useState(null);
  const [sectorBreakdown, setSectorBreakdown] = useState([]);
  const [indexDetails, setIndexDetails] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      
      const factorData = await apiService.fetchEmissionFactors(selectedCity);
      setFactors(factorData);

      const avgUsage = await apiService.fetchAverageUsage(selectedCity);
      console.log('Setting inputs from API:', avgUsage);
      setInputs({
        energy: String(avgUsage.energy),
        transport: String(avgUsage.transport),
        waste: String(avgUsage.waste),
      });

      const history = await apiService.fetchHistoricalData(selectedCity);
      setHistoricalData(history);

      const profile = await apiService.fetchIndexingData(selectedCity);
      setIndexingSummary(profile.summary);
      setSectorBreakdown(profile.sectors);
      setIndexDetails(profile.details);

      if (history.length > 1) {
        const start = history[0].index;
        const end = history[history.length - 1].index;
        const years = history.length - 1;
        const rate = Math.pow(end / start, 1 / years) - 1;
        setGrowthRate(rate);

        const future = [];
        let currentVal = end;
        for (let i = 1; i <= 5; i += 1) {
          currentVal *= 1 + rate;
          future.push({
            year: 2024 + i,
            index: parseFloat(currentVal.toFixed(2)),
            status: currentVal > 450 ? 'Critical' : 'Warning',
          });
        }
        setPredictions(future);
      }
      
      setIsLoading(false);
    };

    initData();
  }, [selectedCity]);

  const handleCalculate = () => {
    if (!factors) return;

    const energyEmission = (parseFloat(inputs.energy) || 0) * factors.energy;
    const transportEmission = (parseFloat(inputs.transport) || 0) * factors.transport;
    const wasteEmission = (parseFloat(inputs.waste) || 0) * factors.waste;

    const total = energyEmission + transportEmission + wasteEmission;
    setCurrentFootprint(total.toFixed(2));

    const trees = Math.ceil(total / 25);
    setTreesRequired(trees);
  };

  const numericFootprint = currentFootprint ? parseFloat(currentFootprint) : 0;
  const offsetPercent = numericFootprint ? Math.min(100, ((treesRequired * 25) / numericFootprint) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-stone-950 text-emerald-50 font-sans overflow-hidden">
      <div className="fixed inset-0 z-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-green-950 to-black" />
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#0f172a] to-transparent opacity-40" />
      </div>

      <aside className="w-64 max-w-xs z-10 bg-black/50 backdrop-blur-xl border-r border-emerald-900/40 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-emerald-800 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/50">
            <Leaf className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-emerald-400">GREEN COMPASS</h1>
            <span className="text-xs text-stone-500">CARBON INTEL • NEPAL</span>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <NavButton active={activeTab === 'indexing'} onClick={() => setActiveTab('indexing')} icon={TrendingUp} label="Carbon Indexing" />
          <NavButton active={activeTab === 'calculator'} onClick={() => setActiveTab('calculator')} icon={Activity} label="Calculator" />
          <NavButton active={activeTab === 'predictions'} onClick={() => setActiveTab('predictions')} icon={Wind} label="5-Year Forecast" />
          <NavButton active={activeTab === 'solutions'} onClick={() => setActiveTab('solutions')} icon={Trees} label="Mitigation" />
        </nav>

        <div className="mt-auto pt-6 border-t border-emerald-900/30">
          <div className="text-xs text-stone-500 mb-2">REGION SELECTOR</div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full bg-stone-900 border border-emerald-900/50 text-emerald-100 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none"
          >
            <option value="Kathmandu">Kathmandu</option>
            <option value="Bhaktapur">Bhaktapur</option>
            <option value="Lalitpur">Lalitpur</option>
          </select>
          <div className="flex items-center gap-2 mt-4 text-xs text-emerald-600/60">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {API_KEY ? 'Gemini API connected' : 'Using mock data'}
          </div>
        </div>
      </aside>

      <main className="flex-1 z-10 p-8 overflow-y-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-light text-white mb-1">
              {activeTab === 'indexing' && 'Carbon Indexing'}
              {activeTab === 'calculator' && 'Carbon Footprint Calculator'}
              {activeTab === 'predictions' && 'Future Impact Projection'}
              {activeTab === 'solutions' && 'Sustainable Solutions'}
            </h2>
            <p className="text-stone-400 text-sm">
              Live focus: <span className="text-emerald-400 font-semibold">{selectedCity}, Nepal</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500 uppercase tracking-widest">Growth Rate</div>
            <div className={`text-2xl font-bold ${growthRate > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {(growthRate * 100 || 0).toFixed(2)}% / yr
            </div>
          </div>
        </header>

        {activeTab === 'indexing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard label="Current Index" value={indexingSummary?.current ?? '--'} suffix="ppm" tone="from-emerald-600 to-emerald-700" />
              <SummaryCard label="Target" value={indexingSummary?.target ?? '--'} suffix="ppm" tone="from-teal-600 to-emerald-600" />
              <SummaryCard label="Trend" value={`${indexingSummary?.trend ?? '--'}%`} suffix="q/q" tone="from-amber-600 to-amber-700" />
              <SummaryCard label="Status" value={indexingSummary?.status ?? '--'} tone="from-sky-600 to-emerald-600" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-stone-900/70 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-emerald-400 font-semibold">Emissions by Sector</h3>
                  <span className="text-xs text-stone-500">Share of total</span>
                </div>
                <div className="space-y-4">
                  {sectorBreakdown.map((sector) => (
                    <div key={sector.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-200">{sector.name}</span>
                        <span className="text-emerald-300">{sector.value}%</span>
                      </div>
                      <div className="h-3 bg-stone-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${sector.value}%`, backgroundColor: sector.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-stone-400 text-sm mt-4 leading-relaxed">{indexDetails}</p>
              </div>

              <div className="bg-gradient-to-b from-stone-900 to-black border border-white/5 rounded-2xl p-6">
                <h3 className="text-emerald-400 font-semibold mb-4">Sector Share (Pie)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sectorBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {sectorBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value}%`, name]}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#059669', color: '#e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-xs text-stone-400">
                  Data mocked for demo. Replace with live API data using your key stored in VITE_GOOGLE_API_KEY.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-stone-900/70 backdrop-blur-md border border-white/5 rounded-2xl p-8">
              <h3 className="text-emerald-400 font-semibold mb-6 flex items-center gap-2">
                <Wind size={18} /> Input Consumption Data
                {isLoading && <span className="text-xs text-stone-400 font-normal ml-2">(Loading from AI...)</span>}
              </h3>

              {isLoading ? (
                <div className="space-y-5">
                  <div className="animate-pulse">
                    <div className="h-4 bg-stone-700 rounded w-1/3 mb-2"></div>
                    <div className="h-12 bg-stone-800 rounded"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-4 bg-stone-700 rounded w-1/3 mb-2"></div>
                    <div className="h-12 bg-stone-800 rounded"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-4 bg-stone-700 rounded w-1/3 mb-2"></div>
                    <div className="h-12 bg-stone-800 rounded"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <InputGroup label="Electricity Usage" unit="kWh/month" value={inputs.energy} onChange={(v) => setInputs({ ...inputs, energy: v })} />
                  <InputGroup label="Transportation (Petrol)" unit="Liters/month" value={inputs.transport} onChange={(v) => setInputs({ ...inputs, transport: v })} />
                  <InputGroup label="Waste Production" unit="kg/month" value={inputs.waste} onChange={(v) => setInputs({ ...inputs, waste: v })} />
                  
                  <div className="text-xs text-stone-500 italic">
                    Values pre-filled with {selectedCity} averages from Gemini AI. Adjust as needed.
                  </div>

                  <button
                    onClick={handleCalculate}
                    className="w-full mt-4 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-semibold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]"
                  >
                    Calculate Footprint
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-b from-stone-800/60 to-emerald-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
              {currentFootprint ? (
                <>
                  <div className="text-stone-400 text-sm uppercase tracking-widest mb-2">Total Monthly Emissions</div>
                  <div className="text-6xl font-bold text-white mb-2">{currentFootprint}</div>
                  <div className="text-emerald-400 text-xl mb-6">kg CO2e</div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <StatCard label="Status" value={numericFootprint > 200 ? 'High' : 'Moderate'} color={numericFootprint > 200 ? 'text-red-400' : 'text-yellow-400'} />
                    <StatCard label="Offset Cost" value={`NPR ${(numericFootprint * 0.5).toFixed(0)}`} color="text-emerald-300" />
                    <StatCard label="Trees Needed" value={treesRequired} color="text-emerald-300" />
                    <StatCard label="Offset Potential" value={`${offsetPercent.toFixed(1)}%`} color="text-emerald-400" />
                  </div>
                </>
              ) : (
                <div className="text-stone-500 italic">Enter data to view analysis...</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="space-y-6">
            <div className="bg-stone-900/70 backdrop-blur-md border border-white/5 rounded-2xl p-8 h-[420px]">
              <h3 className="text-emerald-400 font-semibold mb-6 flex items-center gap-2">
                <TrendingUp size={18} /> 5-Year Carbon Index Projection
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...historicalData, ...predictions]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="year" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderColor: '#065f46', color: '#fff' }} itemStyle={{ color: '#34d399' }} />
                  <Legend />
                  <Line type="monotone" dataKey="index" name="Carbon Index (PPM)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {predictions.map((pred) => (
                <div key={pred.year} className="bg-white/5 border border-white/5 p-4 rounded-xl">
                  <div className="text-stone-400 text-xs mb-1">Year {pred.year}</div>
                  <div className="text-xl font-bold text-white">
                    {pred.index} <span className="text-xs font-normal text-stone-500">ppm</span>
                  </div>
                  <div className={`text-xs mt-2 ${pred.status === 'Critical' ? 'text-red-400' : 'text-yellow-400'} flex items-center gap-1`}>
                    <AlertTriangle size={10} /> {pred.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'solutions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-stone-900/70 backdrop-blur-md border border-white/5 rounded-2xl p-8">
              <h3 className="text-emerald-400 font-semibold mb-6 flex items-center gap-2">
                <Trees size={18} /> Offset Calculator
              </h3>
              <p className="text-stone-300 text-sm mb-6">
                Based on your calculated footprint of <strong>{currentFootprint || 0} kg</strong>, here is your biological offset requirement.
              </p>

              <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 bg-emerald-900/40 rounded-full flex items-center justify-center border border-emerald-500/30">
                  <Trees className="text-emerald-400" size={40} />
                </div>
                <div>
                  <div className="text-4xl font-bold text-white">{treesRequired}</div>
                  <div className="text-emerald-400 text-sm">Trees Needed</div>
                  <div className="text-stone-500 text-xs mt-1">To neutralize monthly impact (est. 25kg CO2/tree/year)</div>
                </div>
              </div>

              <button className="w-full py-3 border border-emerald-600 text-emerald-400 rounded-lg hover:bg-emerald-900/20 transition-colors">
                Find Plantation Partners in {selectedCity}
              </button>
            </div>

            <div className="space-y-4">
              <SolutionCard title="Solar Transition" desc="Switch 50% of energy to solar to trim ~40% of emissions." impact="High Impact" />
              <SolutionCard title="EV Adoption" desc="Replace one petrol vehicle with an EV to save ~150kg CO2/month." impact="High Impact" />
              <SolutionCard title="Waste Segregation" desc="Composting and segregation curb landfill methane." impact="Medium Impact" />
              <SolutionCard title="Demand Response" desc="Shift heavy loads to off-peak hours to reduce diesel backup." impact="Medium Impact" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
      active ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : 'text-stone-400 hover:text-emerald-200 hover:bg-white/5'
    }`}
  >
    <Icon size={18} />
    <span className="text-sm font-medium">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />}
  </button>
);

const InputGroup = ({ label, unit, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-stone-400 text-xs uppercase tracking-wider ml-1">{label}</label>
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-stone-700 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors"
        placeholder="0"
      />
      <span className="absolute right-4 top-3.5 text-stone-500 text-sm">{unit}</span>
    </div>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
    <div className="text-stone-500 text-xs">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
);

const SummaryCard = ({ label, value, suffix, tone }) => (
  <div className={`bg-gradient-to-br ${tone} p-5 rounded-xl border border-white/10 shadow-lg shadow-emerald-900/30`}>
    <div className="text-emerald-100 text-xs mb-2 uppercase tracking-wide">{label}</div>
    <div className="text-3xl font-bold text-white">
      {value}
      {suffix ? <span className="text-sm font-normal text-emerald-100 ml-1">{suffix}</span> : null}
    </div>
  </div>
);

const SolutionCard = ({ title, desc, impact }) => (
  <div className="bg-stone-900/40 border border-emerald-900/30 p-5 rounded-xl flex items-start justify-between hover:border-emerald-500/50 transition-colors cursor-pointer group">
    <div>
      <h4 className="text-white font-medium mb-1 group-hover:text-emerald-400 transition-colors">{title}</h4>
      <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
    </div>
    <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20 whitespace-nowrap">{impact}</span>
  </div>
);

export default GreenCompass;
