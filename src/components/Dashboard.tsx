"use client";

import React, { useEffect, useState } from 'react';
import { TrendingDown, AlertCircle, DollarSign, ExternalLink, Calendar, Gauge, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface Car {
  id: string;
  source_url: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  price_usd: number;
  is_anomaly: boolean;
  score: number;
  location: string;
  image_url?: string;
}

const CAR_MODELS: Record<string, string[]> = {
    'Toyota': ['Hilux', 'Corolla', 'SW4', 'Yaris'],
    'Volkswagen': ['Amarok', 'Golf', 'Vento', 'Polo'],
    'Ford': ['Ranger', 'Fiesta', 'Focus', 'Maverick'],
    'Chevrolet': ['S10', 'Cruze', 'Onix', 'Tracker']
};

export default function Dashboard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  
  // Scraper inputs
  const [selectedBrand, setSelectedBrand] = useState('Toyota');
  const [selectedModel, setSelectedModel] = useState('Hilux');
  const [selectedYear, setSelectedYear] = useState('2020');
  
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  const fetchCars = async () => {
    setLoadingDb(true);
    const { data, error } = await supabase
        .from('car_listings')
        .select('*')
        .order('score', { ascending: false })
        .limit(30);
    
    if (data) {
        setCars(data);
    } else {
        console.error("Supabase fetch error:", error);
    }
    setLoadingDb(false);
  };

  useEffect(() => {
    fetchCars();
    
    // Optional: Set up real-time subscription
    const channel = supabase.channel('realtime-cars')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'car_listings' }, payload => {
          setCars(prev => [payload.new as Car, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleManualScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScraping(true);
    setScrapeError('');
    
    // We send structured data instead of just the URL so the backend can build the mock
    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                brand: selectedBrand,
                model: selectedModel,
                year: selectedYear
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Error HTTP: ${response.status}`);
        }
        
        setTimeout(fetchCars, 1000);
    } catch (err: any) {
        setScrapeError(err.message);
    } finally {
        setIsScraping(false);
    }
  };

  const anomaliesCount = cars.filter(c => c.is_anomaly).length;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 font-sans">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col justify-between items-start gap-6 border-b border-white/10 pb-8">
        <div>
          <h1 className="text-4xl font-bold gradient-text">MVP AutoCheck</h1>
          <p className="text-zinc-400 mt-2">Detección de "Gangas" interna</p>
        </div>
        
        {/* Scraper Form Filters */}
        <form onSubmit={handleManualScrape} className="w-full bg-zinc-900/50 p-4 border border-white/5 rounded-2xl flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold ml-1">Marca</label>
                <select 
                    value={selectedBrand} 
                    onChange={(e) => {
                        setSelectedBrand(e.target.value);
                        setSelectedModel(CAR_MODELS[e.target.value][0]); // reset model
                    }}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    disabled={isScraping}
                >
                    {Object.keys(CAR_MODELS).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>

            <div className="flex-1 w-full flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold ml-1">Modelo</label>
                <select 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    disabled={isScraping}
                >
                    {CAR_MODELS[selectedBrand].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            <div className="flex-1 w-full flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold ml-1">Año</label>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    disabled={isScraping}
                >
                    {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                </select>
            </div>

            <button 
                type="submit" 
                disabled={isScraping}
                className="w-full md:w-auto h-[46px] bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-semibold px-6 rounded-xl flex items-center justify-center transition-colors"
            >
                {isScraping ? <><Loader2 size={18} className="mr-2 animate-spin" /> Buscando...</> : 'Explorar y Analizar'}
            </button>
        </form>
      </header>

      {scrapeError && (
        <div className="max-w-7xl mx-auto mb-8 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-2">
            <AlertCircle size={18} /> {scrapeError}
        </div>
      )}

      <main className="max-w-7xl mx-auto space-y-8">
        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Gauge className="text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Autos en Base</p>
              <p className="text-2xl font-bold">{cars.length}</p>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TrendingDown className="text-emerald-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Anomalías Detectadas</p>
              <p className="text-2xl font-bold">{anomaliesCount}</p>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <AlertCircle className="text-amber-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Estado de Red</p>
              <p className="text-lg font-medium text-emerald-400 flex items-center gap-2 mt-1">
                 <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Online
              </p>
            </div>
          </div>
        </section>

        {/* Feed List */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AlertCircle className="text-amber-400" />
              Feed Relevante
            </h2>
          </div>

          {loadingDb ? (
             <div className="flex justify-center py-20 text-zinc-500">
                <Loader2 className="animate-spin" size={32} />
             </div>
          ) : cars.length === 0 ? (
             <div className="text-center py-20 text-zinc-500 bg-zinc-900/50 rounded-2xl border border-white/5">
                No hay resultados en la base de datos.
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cars.map((car) => (
                <div key={car.id} className="glass rounded-2xl border-white/5 card-hover transition-all duration-300 group overflow-hidden flex flex-col">
                    {/* Image Header */}
                    <div className="h-48 bg-zinc-800 relative w-full overflow-hidden">
                        {car.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={car.image_url} alt={car.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full flex flex-col justify-center items-center text-zinc-700">
                                <Search size={32} className="mb-2 opacity-50"/>
                                <span className="text-xs uppercase font-bold tracking-widest opacity-50">Sin Foto</span>
                            </div>
                        )}
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-emerald-400 text-xs px-2 py-1 rounded font-bold border border-emerald-500/30">
                            SCORE {car.score}
                        </div>
                    </div>

                    <div className="p-5 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-zinc-500 text-xs uppercase tracking-wider">{car.location}</span>
                            <a href={car.source_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition-colors">
                            <ExternalLink size={16} />
                            </a>
                        </div>

                        <h3 className="flex-grow text-lg font-bold mb-4 group-hover:text-blue-400 transition-colors line-clamp-2">
                            {car.title}
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Año / KM</span>
                                <span className="text-sm font-medium flex items-center gap-1">
                                    <Calendar size={12} className="text-zinc-400" /> {car.year} | {car.km.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Precio USD</span>
                                <span className="text-lg font-bold text-emerald-400 flex items-center gap-1">
                                    <DollarSign size={16} /> {car.price_usd.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {car.is_anomaly && (
                            <div className="pt-3 border-t border-white/5 text-xs font-medium text-amber-400 flex items-center gap-1">
                                <TrendingDown size={14} /> Posible Oportunidad de Compra
                            </div>
                        )}
                    </div>
                </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
