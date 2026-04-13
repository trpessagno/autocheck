import React from 'react';
import { TrendingDown, AlertCircle, DollarSign, ExternalLink, Calendar, Gauge } from 'lucide-react';

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
}

const mockCars: Car[] = [
  {
    id: '1',
    source_url: '#',
    title: 'Volkswagen Vento 2.0 Tsi Gli',
    brand: 'Volkswagen',
    model: 'Vento',
    year: 2018,
    km: 65000,
    price_usd: 18500,
    is_anomaly: true,
    score: 9.2,
    location: 'CABA'
  },
  {
    id: '2',
    source_url: '#',
    title: 'Toyota Corolla 1.8 Seg Hybrid',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2021,
    km: 22000,
    price_usd: 24000,
    is_anomaly: true,
    score: 8.5,
    location: 'GBA Norte'
  }
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 font-sans">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold gradient-text">AutoCheck Intelligence</h1>
          <p className="text-zinc-400 mt-2">Detección de anomalías en tiempo real - Mercado Argentino</p>
        </div>
        <div className="glass px-4 py-2 rounded-full text-sm font-medium border-blue-500/30 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live: USD Blue $1.150
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Gauge className="text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Escaneos Hoy</p>
              <p className="text-2xl font-bold">1,248</p>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TrendingDown className="text-emerald-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Gangas Detectadas</p>
              <p className="text-2xl font-bold">14</p>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border-white/5 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <AlertCircle className="text-amber-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Promedio de Ahorro</p>
              <p className="text-2xl font-bold">18.5%</p>
            </div>
          </div>
        </section>

        {/* Anomalies List */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AlertCircle className="text-amber-400" />
              Oportunidades de Alto Impacto
            </h2>
            <button className="text-sm text-blue-400 hover:text-blue-300">Ver todas</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockCars.map((car) => (
              <div key={car.id} className="glass p-5 rounded-2xl border-white/5 card-hover transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded font-bold">
                      SCORE {car.score}
                    </span>
                    <span className="text-zinc-500 text-xs">{car.location}</span>
                  </div>
                  <a href={car.source_url} className="text-zinc-500 hover:text-white transition-colors">
                    <ExternalLink size={18} />
                  </a>
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
                  {car.title}
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Año</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Calendar size={14} className="text-zinc-400" /> {car.year}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Kilómetros</span>
                    <span className="text-sm font-medium italic italic">
                      {car.km.toLocaleString()} km
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Precio USD</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                      <DollarSign size={14} /> {car.price_usd.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                  <div className="text-xs text-zinc-500">
                    Median: <span className="text-zinc-300 font-medium">USD 21,200</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    - {( ((21200 - car.price_usd) / 21200) * 100 ).toFixed(1)}% Ahorro
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
