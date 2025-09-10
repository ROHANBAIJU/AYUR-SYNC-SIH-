// app/dashboard/india-map/LeafletMap.tsx
"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Global window interface extension
declare global {
  interface Window {
    selectState?: (stateName: string) => void;
  }
}

// Define state type
export type StateInfo = {
  name: string;
  patients: number;
  ayurvedaCenters: number;
  practitioners: number;
  coordinates: [number, number];
};

// Fix for default markers
interface IconDefault extends L.Icon.Default {
  _getIconUrl?: () => string;
}
delete (L.Icon.Default.prototype as IconDefault)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface LeafletMapProps {
  stateData: { [key: string]: StateInfo };
  onStateClick: (stateName: string) => void;
  selectedState: StateInfo | null;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ stateData, onStateClick, selectedState }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629], // Center of India
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Create custom icons based on activity level
    const createCustomIcon = (state: StateInfo, isSelected: boolean) => {
      const activityLevel = state.patients > 1000 ? 'high' : state.patients > 500 ? 'medium' : 'low';
      const color = isSelected 
        ? '#f59e0b' // Selected color (amber)
        : activityLevel === 'high' 
          ? '#059669' // High activity (green)
          : activityLevel === 'medium' 
            ? '#0891b2' // Medium activity (cyan)
            : '#6b7280'; // Low activity (gray)

      return L.divIcon({
        html: `
          <div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
          ">
            ${state.ayurvedaCenters}
          </div>
        `,
        className: 'custom-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
    };

    // Add markers for each state
    Object.values(stateData).forEach((state) => {
      const isSelected = selectedState?.name === state.name;
      const marker = L.marker(state.coordinates, {
        icon: createCustomIcon(state, isSelected)
      }).addTo(map);

      // Create popup content
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
            ${state.name}
          </h3>
          <div style="margin: 4px 0; color: #4b5563; font-size: 14px;">
            <strong>Patients:</strong> ${state.patients.toLocaleString()}
          </div>
          <div style="margin: 4px 0; color: #4b5563; font-size: 14px;">
            <strong>Centers:</strong> ${state.ayurvedaCenters}
          </div>
          <div style="margin: 4px 0; color: #4b5563; font-size: 14px;">
            <strong>Practitioners:</strong> ${state.practitioners}
          </div>
          <button 
            onclick="window.selectState('${state.name}')"
            style="
              margin-top: 8px;
              padding: 4px 8px;
              background-color: #0d9488;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
            "
          >
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Add click event
      marker.on('click', () => {
        onStateClick(state.name);
      });
    });

    // Global function to handle state selection from popup
    window.selectState = (stateName: string) => {
      onStateClick(stateName);
    };

    // Add legend
    const legend = new L.Control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.style.background = 'white';
      div.style.padding = '10px';
      div.style.borderRadius = '8px';
      div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      div.style.fontSize = '12px';
      div.style.lineHeight = '18px';
      
      div.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1f2937;">Activity Level</div>
        <div style="display: flex; align-items: center; margin: 4px 0;">
          <div style="width: 16px; height: 16px; background-color: #059669; border-radius: 50%; margin-right: 8px;"></div>
          <span style="color: #4b5563;">High (1000+ patients)</span>
        </div>
        <div style="display: flex; align-items: center; margin: 4px 0;">
          <div style="width: 16px; height: 16px; background-color: #0891b2; border-radius: 50%; margin-right: 8px;"></div>
          <span style="color: #4b5563;">Medium (500-1000)</span>
        </div>
        <div style="display: flex; align-items: center; margin: 4px 0;">
          <div style="width: 16px; height: 16px; background-color: #6b7280; border-radius: 50%; margin-right: 8px;"></div>
          <span style="color: #4b5563;">Low (<500)</span>
        </div>
        <div style="display: flex; align-items: center; margin: 4px 0;">
          <div style="width: 16px; height: 16px; background-color: #f59e0b; border-radius: 50%; margin-right: 8px;"></div>
          <span style="color: #4b5563;">Selected</span>
        </div>
      `;
      
      return div;
    };
    legend.addTo(map);

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      // Clean up global function
      if (window.selectState) {
        delete window.selectState;
      }
    };
  }, [stateData, onStateClick, selectedState]);

  // Update markers when selected state changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers and re-add them with updated selection state
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Re-add markers with updated selection
    Object.values(stateData).forEach((state) => {
      const isSelected = selectedState?.name === state.name;
      const createCustomIcon = (state: StateInfo, isSelected: boolean) => {
        const activityLevel = state.patients > 1000 ? 'high' : state.patients > 500 ? 'medium' : 'low';
        const color = isSelected 
          ? '#f59e0b' // Selected color (amber)
          : activityLevel === 'high' 
            ? '#059669' // High activity (green)
            : activityLevel === 'medium' 
              ? '#0891b2' // Medium activity (cyan)
              : '#6b7280'; // Low activity (gray)

        return L.divIcon({
          html: `
            <div style="
              background-color: ${color};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              color: white;
            ">
              ${state.ayurvedaCenters}
            </div>
          `,
          className: 'custom-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
      };

      const marker = L.marker(state.coordinates, {
        icon: createCustomIcon(state, isSelected)
      }).addTo(mapRef.current!);

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
            ${state.name}
          </h3>
          <div style="margin: 4px 0; color: #4b5563; font-size: 14px;">
            <strong>Patients:</strong> ${state.patients.toLocaleString()}
          </div>
          <div style="margin: 4px 0; color: #4b5563; font-size: 14px;">
            <strong>Centers:</strong> ${state.ayurvedaCenters}
          </div>
          <div style="margin: 4px 0; color: #4b5563; font-size: 14px;">
            <strong>Practitioners:</strong> ${state.practitioners}
          </div>
          <button 
            onclick="window.selectState('${state.name}')"
            style="
              margin-top: 8px;
              padding: 4px 8px;
              background-color: #0d9488;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 12px;
              cursor: pointer;
            "
          >
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        onStateClick(state.name);
      });
    });
  }, [selectedState, stateData, onStateClick]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
};

// Named export for better TypeScript support
export { LeafletMap };
export default LeafletMap;
