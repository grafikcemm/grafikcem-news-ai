"use client";

import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ScoreBadge } from '@/components/ui/score-badge';
import { Button } from '@/components/ui/button';

interface Lead {
  id: string;
  business_name: string;
  sector: string;
  status: string;
  potential_score: number;
  city: string;
  district: string;
  has_website: boolean;
  recommended_services: string[];
  estimated_price_min?: number;
  estimated_price_max?: number;
  ai_analysis?: string;
  phone?: string;
  created_at: string;
}

interface LeadMapProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const CITY_COORDS: Record<string, [number, number]> = {
  'İstanbul': [41.0082, 28.9784],
  'Ankara': [39.9334, 32.8597],
  'İzmir': [38.4237, 27.1428],
  'Antalya': [36.8969, 30.7133],
  'Bursa': [40.1885, 29.0610],
  'Adana': [37.0000, 35.3213],
  'Konya': [37.8746, 32.4932],
  'Gaziantep': [37.0662, 37.3825],
  'Mersin': [36.8000, 34.6415],
  'Trabzon': [41.0015, 39.7267],
  'Samsun': [41.2867, 36.3319],
  'Denizli': [37.7765, 29.0875],
  'Kayseri': [38.7312, 35.4826],
  'Eskişehir': [39.7767, 30.5206],
  'Diyarbakır': [37.9144, 40.2106],
};

const STATUS_COLORS: Record<string, string> = {
  discovered: '#60a5fa',
  researched: '#fbbf24',
  contacted: '#e07a3a',
  won: '#34d399',
  lost: '#f87171',
};

const mapStyle = { height: '100%', width: '100%', background: 'var(--surface-base)' };

export default function LeadMap({ leads, onSelectLead }: LeadMapProps) {
  const [sectorFilter, setSectorFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilters, setStatusFilters] = useState({
    NEW: true,
    CONTACTED: true,
    WON: true,
    LOST: true
  });

  const uniqueSectors = useMemo(() => Array.from(new Set(leads.map(l => l.sector))), [leads]);
  const uniqueCities = useMemo(() => Array.from(new Set(leads.map(l => l.city))), [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Sector filter
      if (sectorFilter !== 'all' && l.sector !== sectorFilter) return false;
      
      // City filter
      if (cityFilter !== 'all' && l.city !== cityFilter) return false;

      // Status mapping for filter
      let filterKey = '';
      if (['discovered', 'researched'].includes(l.status)) filterKey = 'NEW';
      else if (l.status === 'contacted' || l.status === 'proposal_sent' || l.status === 'pitched') filterKey = 'CONTACTED';
      else if (l.status === 'won') filterKey = 'WON';
      else if (l.status === 'lost') filterKey = 'LOST';
      
      if (filterKey && !statusFilters[filterKey as keyof typeof statusFilters]) return false;

      return true;
    });
  }, [leads, sectorFilter, cityFilter, statusFilters]);

  return (
    <div className="flex h-full" style={{ background: 'var(--surface-base)' }}>
      {/* Sidebar Filter */}
      <div style={{
        width: 240,
        background: 'var(--surface-raised)',
        borderRight: '1px solid var(--border-subtle)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        <p className="text-label">// FİLTRELER</p>

        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 9 }}>ŞEHİR</label>
          <select 
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 10px',
              fontSize: 12,
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          >
            <option value="all">Tüm Şehirler</option>
            {uniqueCities.sort().map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 9 }}>SEKTÖR</label>
          <select 
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 10px',
              fontSize: 12,
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          >
            <option value="all">Tüm Sektörler</option>
            {uniqueSectors.sort().map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-label" style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>DURUM</label>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={statusFilters.NEW}
              onChange={(e) => setStatusFilters({...statusFilters, NEW: e.target.checked})}
              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              style={{ accentColor: STATUS_COLORS.discovered }}
            />
            <span style={{ fontSize: 12, color: statusFilters.NEW ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              <span style={{ color: STATUS_COLORS.discovered, marginRight: 6 }}>●</span> NEW
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={statusFilters.CONTACTED}
              onChange={(e) => setStatusFilters({...statusFilters, CONTACTED: e.target.checked})}
              style={{ accentColor: STATUS_COLORS.contacted }}
            />
            <span style={{ fontSize: 12, color: statusFilters.CONTACTED ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              <span style={{ color: STATUS_COLORS.contacted, marginRight: 6 }}>●</span> CONTACTED
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={statusFilters.WON}
              onChange={(e) => setStatusFilters({...statusFilters, WON: e.target.checked})}
              style={{ accentColor: STATUS_COLORS.won }}
            />
            <span style={{ fontSize: 12, color: statusFilters.WON ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              <span style={{ color: STATUS_COLORS.won, marginRight: 6 }}>●</span> WON
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={statusFilters.LOST}
              onChange={(e) => setStatusFilters({...statusFilters, LOST: e.target.checked})}
              style={{ accentColor: STATUS_COLORS.lost }}
            />
            <span style={{ fontSize: 12, color: statusFilters.LOST ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              <span style={{ color: STATUS_COLORS.lost, marginRight: 6 }}>●</span> LOST
            </span>
          </label>
        </div>

        <div className="mt-auto" style={{ 
          padding: '12px', 
          background: 'var(--surface-elevated)', 
          borderRadius: 'var(--radius-md)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>GÖSTERİLEN</p>
          <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>
            {filteredLeads.length} <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>/ {leads.length}</span>
          </p>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer 
          center={[38.96, 35.24]} 
          zoom={6} 
          style={mapStyle}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          {filteredLeads.map((lead) => {
            const baseCoords = CITY_COORDS[lead.city] || [41.0082, 28.9784];
            // Add deterministic pseudo-random offset based on lead.id
            const seed = lead.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const latOffset = (Math.sin(seed) * 0.08); // Slightly larger spread for better visibility
            const lngOffset = (Math.cos(seed) * 0.08);
            
            const position: [number, number] = [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
            const color = STATUS_COLORS[lead.status] || STATUS_COLORS.discovered;

            return (
              <CircleMarker
                key={lead.id}
                center={position}
                radius={8}
                pathOptions={{
                  fillColor: color,
                  color: 'white',
                  weight: 1,
                  fillOpacity: 0.8,
                }}
                eventHandlers={{
                  mouseover: (e) => { e.target.setRadius(12); },
                  mouseout: (e) => { e.target.setRadius(8); },
                }}
              >
                <Popup className="lead-popup">
                  <div style={{ minWidth: 200 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#f8fafc' }}>{lead.business_name}</p>
                    <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                      <span style={{ 
                        fontSize: 10, 
                        background: 'rgba(255,255,255,0.1)', 
                        padding: '2px 6px', 
                        borderRadius: 4,
                        color: '#94a3b8'
                      }}>
                        {lead.sector}
                      </span>
                      <ScoreBadge score={lead.potential_score} />
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                      {lead.city}{lead.district ? ` / ${lead.district}` : ''}
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full h-8" 
                      style={{ fontSize: 11 }}
                      onClick={() => onSelectLead(lead)}
                    >
                      Detay Gör →
                    </Button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        <style jsx global>{`
          .leaflet-container {
            background: #080b12 !important;
          }
          .lead-popup .leaflet-popup-content-wrapper {
            background: #111827 !important;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            color: #f8fafc !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          }
          .lead-popup .leaflet-popup-tip {
            background: #111827 !important;
          }
        `}</style>
      </div>
    </div>
  );
}
