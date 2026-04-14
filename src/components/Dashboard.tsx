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

export default function Dashboard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  
  // Search & Scrape specific states
  const [searchQuery, setSearchQuery] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  // Initial Data Load
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
    if (!searchQuery) return;

    setIsScraping(true);
    setScrapeError('');
    
    // Build ML Search URL based on query
    // e.g. "Toyota SW4" -> "toyota%20sw4"
    const parsedQuery = encodeURIComponent(searchQuery.toLowerCase().trim().replace(/ /g, '-'));
    const dynamicUrl = `https://autos.mercadolibre.com.ar/${parsedQuery}/_OrderId_PRICE_ASC`;

    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryUrl: dynamicUrl })
        });

        if (!response.ok) {
            throw new Error('Fallo al ejecutar el scraper.');
        }
        
        // Wait a couple seconds and refetch to make sure db triggers completed.
        // Actually real-time listener will catch them if they are inserted!
        setTimeout(fetchCars, 3000);
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
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text">MVP AutoCheck</h1>
          <p className="text-zinc-400 mt-2">Detección de "Gangas" interna</p>
        </div>
        
        {/* Scraper / Search Input */}
        <form onSubmit={handleManualScrape} className="w-full md:w-auto relative max-w-sm">
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ej. Toyota Sw4 2020..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-11 pr-32 focus:outline-none focus:border-blue-500 transition-colors"
                disabled={isScraping}
            />
            <Search className="absolute left-4 top-3.5 text-zinc-500" size={18} />
            <button 
                type="submit" 
                disabled={isScraping || !searchQuery}
                className="absolute right-1 top-1 bottom-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-sm font-semibold px-4 rounded-lg flex items-center transition-colors"
            >
                {isScraping ? <><Loader2 size={16} className="mr-2 animate-spin" /> Escaneando</> : 'Explorar'}
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
