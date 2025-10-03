import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CustomerInfo } from './EstimatePDF';

// Declare google for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

interface MapViewProps {
  customers: CustomerInfo[];
  onUpdateCustomer: (customer: CustomerInfo) => void;
}

const MapView: React.FC<MapViewProps> = ({ customers, onUpdateCustomer }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any | null>(null);
  const [infoWindow, setInfoWindow] = useState<any | null>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  // Ref to track customers currently being geocoded to prevent duplicate API calls
  const geocodingInProgress = useRef(new Set<number>());

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || map) return; // Prevent re-initialization

      try {
        const { Map } = await window.google.maps.importLibrary("maps");
        
        const mapInstance = new Map(mapRef.current as HTMLDivElement, {
          center: { lat: 39.8283, lng: -98.5795 }, // Center of US
          zoom: 4,
          mapId: 'FOAM_CRM_MAP', // Required for advanced markers
          mapTypeId: 'hybrid',
          tilt: 45,
        });
        setMap(mapInstance);
        
        const infoWindowInstance = new window.google.maps.InfoWindow();
        setInfoWindow(infoWindowInstance);

      } catch (e) {
        console.error("Error loading Google Maps", e);
      }
    };

    const checkAndInit = () => {
      if (window.google && window.google.maps) {
        initMap();
        return true;
      }
      return false;
    };

    if (!checkAndInit()) {
      const interval = setInterval(() => {
        if (checkAndInit()) {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [map]);


  const geocodeAddress = useCallback((customer: CustomerInfo) => {
    if (!customer.id || !customer.address || geocodingInProgress.current.has(customer.id)) {
        return;
    }
    geocodingInProgress.current.add(customer.id);

    window.google.maps.importLibrary("geocoding").then(({ Geocoder }: any) => {
        const geocoder = new Geocoder();
        geocoder.geocode({ address: customer.address }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                onUpdateCustomer({ ...customer, lat: location.lat(), lng: location.lng() });
            } else {
                console.warn(`Geocode failed for address "${customer.address}": ${status}`);
            }
            // Once complete (success or fail), remove from the in-progress set
            geocodingInProgress.current.delete(customer.id!);
        });
    }).catch((e: any) => {
        console.error("Error loading Geocoding library for address:", customer.address, e);
        // Also remove on error
        geocodingInProgress.current.delete(customer.id!);
    });
  }, [onUpdateCustomer]);


  useEffect(() => {
    if (!map || !infoWindow) return;

    const placeMarkers = async () => {
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");
        const bounds = new window.google.maps.LatLngBounds();
        let locationsFound = 0;
        
        const currentCustomerIds = new Set(customers.map(c => c.id));
        
        // Remove markers for deleted customers
        markersRef.current.forEach((marker, customerId) => {
            if (!currentCustomerIds.has(customerId)) {
                (marker as any).map = null;
                markersRef.current.delete(customerId);
            }
        });

        for (const customer of customers) {
          if (customer.lat && customer.lng) {
            const position = { lat: customer.lat, lng: customer.lng };
            locationsFound++;
            bounds.extend(position);

            if (!markersRef.current.has(customer.id)) {
                const marker = new AdvancedMarkerElement({
                  map,
                  position,
                  title: customer.name,
                });

                marker.addListener('click', () => {
                  const content = `
                    <div class="font-sans p-1">
                      <h3 class="font-bold text-base text-slate-800">${customer.name}</h3>
                      <p class="text-sm text-slate-600">${customer.address}</p>
                      <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.address)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm font-semibold">Get Directions</a>
                    </div>
                  `;
                  infoWindow.setContent(content);
                  infoWindow.open(map, marker);
                });
                
                markersRef.current.set(customer.id, marker as any);
            }
            
          } else {
            // Geocode only if address exists and not already in progress
            geocodeAddress(customer);
          }
        }

        if (locationsFound > 0) {
          if (locationsFound === 1) {
              map.setCenter(bounds.getCenter());
              map.setZoom(18); // Zoom in for aerial view
              map.setTilt(45); // Ensure tilt is enabled
              map.setHeading(90); // Rotate for a dynamic perspective
          } else {
              map.fitBounds(bounds);
              map.setTilt(0); // Disable tilt for broad view
              // A slight zoom out after fitBounds can improve UX
              window.google.maps.event.addListenerOnce(map, 'idle', () => {
                  if (map.getZoom() > 16) map.setZoom(16);
              });
          }
        }
    };

    placeMarkers();

  }, [customers, map, infoWindow, geocodeAddress]);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default MapView;