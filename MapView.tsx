



import React, { useState, useEffect, useRef, type FC } from 'react';
import { Loader } from "@googlemaps/js-api-loader";

// --- Google Maps Type Declarations ---
// This is necessary because the script is loaded dynamically and TypeScript
// isn't aware of the `google` global object otherwise.
declare global {
    interface Window {
        google: typeof google;
    }
}

declare namespace google.maps {
    class Map {
        constructor(mapDiv: Element, opts?: any);
        setCenter(latLng: LatLng | any): void;
        setZoom(zoom: number): void;
        getCenter(): LatLng;
        fitBounds(bounds: LatLngBounds | any): void;
    }
    class Marker {
        constructor(opts?: any);
        setMap(map: Map | null): void;
        addListener(eventName: string, handler: Function): MapsEventListener;
    }
    interface MapsEventListener {
        remove(): void;
    }
    class InfoWindow {
        constructor(opts?: any);
        setContent(content: string | Element): void;
        open(map: Map | any, anchor?: any): void;
        close(): void;
        addListener(eventName: string, handler: Function): MapsEventListener;
    }
    class LatLng {
        constructor(lat: number, lng: number);
    }
    class LatLngBounds {
        constructor(sw?: LatLng, ne?: LatLng);
        extend(point: LatLng | any): void;
    }
    enum Animation {
        DROP,
    }
    namespace places {
        class PlacesService {
            constructor(attrContainer: HTMLDivElement | Map);
            textSearch(request: TextSearchRequest, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void): void;
            getDetails(request: { placeId: string; fields?: string[] }, callback: (place: PlaceDetailsResult | null, status: PlacesServiceStatus) => void): void;
        }
        class Autocomplete {
            constructor(inputField: HTMLInputElement, opts?: any);
            getPlace(): PlaceResult;
            addListener(eventName: string, handler: Function): MapsEventListener;
        }
        interface PlaceDetailsResult {
            name?: string;
            formatted_address?: string;
            website?: string;
            geometry?: { location: LatLng };
        }
        interface TextSearchRequest {
            location?: LatLng;
            radius?: number;
            query: string;
        }
        enum PlacesServiceStatus {
            OK = "OK",
        }
        interface PlaceResult {
            geometry?: { location: LatLng };
            name?: string;
            formatted_address?: string;
            website?: string;
            place_id?: string;
        }
    }
}

// --- Component Props ---
interface MapViewProps {
    onStartAudit: (business: { name: string; website?: string }) => void;
}

// --- Constants ---
// Using the API key from the env; optional Map ID for styled maps
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAPS_MAP_ID = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

// Default businesses to always show on the map
const DEFAULT_BUSINESSES = [
    {
        name: "Starbucks",
        position: { lat: 34.0522, lng: -118.2437 },
        website: "https://www.starbucks.com",
        address: "Los Angeles, CA"
    },
    {
        name: "McDonald's",
        position: { lat: 34.0505, lng: -118.2551 },
        website: "https://www.mcdonalds.com",
        address: "Los Angeles, CA"
    },
    {
        name: "Target",
        position: { lat: 34.0469, lng: -118.2509 },
        website: "https://www.target.com",
        address: "Los Angeles, CA"
    }
];


// --- Helper Components ---

const MapLoaderFC: FC = () => (
    <div className="map-loader">
        <div className="loading-spinner"></div>
    </div>
);

const MapError: FC<{ message: string }> = ({ message }) => (
    <div className="map-error-overlay">
        <p>{message}</p>
    </div>
);


// --- Main Map View Component ---
export const MapView: FC<MapViewProps> = ({ onStartAudit }) => {
    const [isApiReady, setIsApiReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [isHistoryVisible, setHistoryVisible] = useState(false);
    const [locationPermission, setLocationPermission] = useState<'pending'|'granted'|'denied'>('pending');
    const [statusMsg, setStatusMsg] = useState<string>("");
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const infoWindow = useRef<google.maps.InfoWindow | null>(null);
    const markers = useRef<google.maps.Marker[]>([]);
    const selectedMarker = useRef<google.maps.Marker | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const listeners = useRef<google.maps.MapsEventListener[]>([]);

    const HISTORY_KEY = 'smartlocal-map-search-history';
    const MAX_HISTORY_ITEMS = 10;

    // Explicit user-gesture location request
    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocationPermission('denied');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocationPermission('granted');
                // If map is already initialized, recenter
                if (isApiReady && mapInstance.current && window.google) {
                    const { latitude, longitude } = position.coords;
                    // @ts-ignore: LatLng type from global google
                    const center = new window.google.maps.LatLng(latitude, longitude);
                    mapInstance.current.setCenter(center);
                    mapInstance.current.setZoom(12);
                    // Drop/update selected marker at current location
                    try {
                        if (selectedMarker.current) selectedMarker.current.setMap(null);
                        selectedMarker.current = new window.google.maps.Marker({
                            map: mapInstance.current,
                            position: center,
                            title: 'Your location',
                            icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                            animation: window.google.maps.Animation.DROP,
                            draggable: true,
                        });
                        // When user fine-tunes by dragging, reload nearby businesses
                        selectedMarker.current.addListener('dragend', (ev: any) => {
                            const newLoc = ev?.latLng || center;
                            mapInstance.current!.setCenter(newLoc);
                            // @ts-ignore center override accepted by our helper
                            if (showBusinessesInBoundsRef.current) {
                                showBusinessesInBoundsRef.current(newLoc);
                            }
                        });
                    } catch {}
                    // Trigger nearby search (idle handler will also fire)
                    // @ts-ignore center override accepted by our helper
                    if (showBusinessesInBoundsRef.current) {
                        showBusinessesInBoundsRef.current(center);
                    }
                }
            },
            () => setLocationPermission('denied')
        );
    };


    // Load search history on mount
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(HISTORY_KEY);
            if (storedHistory) {
                setSearchHistory(JSON.parse(storedHistory));
            }
        } catch (e) {
            console.error("Failed to parse search history from localStorage", e);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Remove all markers
            markers.current.forEach(marker => marker.setMap(null));
            markers.current = [];
            // Remove selected marker
            if (selectedMarker.current) selectedMarker.current.setMap(null);
            // Remove map listeners
            listeners.current.forEach(l => l.remove());
            listeners.current = [];
            // Remove autocomplete listeners
            if (autocompleteRef.current) {
                (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
            // Remove infoWindow listeners
            if (infoWindow.current) {
                (window as any).google.maps.event.clearInstanceListeners(infoWindow.current);
            }
        };
    }, []);


    useEffect(() => {
        // Always request geolocation on mount
        if (locationPermission === 'pending') {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    () => setLocationPermission('granted'),
                    () => setLocationPermission('denied'),
                    { enableHighAccuracy: true }
                );
            } else {
                setLocationPermission('denied');
            }
            // Don't return; let map load continue
        }
        if (isApiReady) return;
        // API key check
        if (!MAPS_API_KEY) {
            setError("Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in your environment.");
            setLoading(false);
            return;
        }
        // Now load the map
        const loader = new Loader({
            apiKey: MAPS_API_KEY,
            version: "weekly",
            libraries: ["places", "marker"],
        });
        loader.load()
            .then(google => {
                setIsApiReady(true);
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            initMap(google, position.coords.latitude, position.coords.longitude, true);
                        },
                        () => {
                            initMap(google, undefined, undefined, false);
                        },
                        { enableHighAccuracy: true }
                    );
                } else {
                    initMap(google, undefined, undefined, false);
                }
            })
            .catch(e => {
                console.error("Failed to load Google Maps script:", e);
                setError("Failed to load Google Maps. Please check that the API key is correct and has the 'Maps JavaScript API' and 'Places API' enabled.");
            })
            .finally(() => {
                 setLoading(false);
            });
    }, [isApiReady, locationPermission]);

    const updateSearchHistory = (query: string) => {
        if (!query || !query.trim()) return;
        const trimmedQuery = query.trim();

        const newHistory = [
            trimmedQuery,
            ...searchHistory.filter(item => item.toLowerCase() !== trimmedQuery.toLowerCase())
        ].slice(0, MAX_HISTORY_ITEMS);

        setSearchHistory(newHistory);
        
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        } catch (e) {
            console.error("Failed to save search history to localStorage", e);
        }
    };


    // Only trigger business search once after centering on user location
    const hasLoadedBusinesses = useRef(false);
    // Track if the map is being moved programmatically
    const programmaticMove = useRef(false);
    // Expose showBusinessesInBounds to the Update button handler
    const showBusinessesInBoundsRef = useRef<null | ((centerOverride?: any) => void)>(null);
    const initMap = (google: typeof window.google, lat?: number, lng?: number, useLocation?: boolean) => {
        if (!mapRef.current || !searchInputRef.current) return;
        if (!google || !(google as any).maps) {
            setError('Google Maps failed to initialize. Please check API key and network.');
            return;
        }

        const center = lat && lng ? { lat, lng } : { lat: 34.0522, lng: -118.2437 };
        const mapOptions: any = {
            center,
            zoom: 12,
        };
        if (MAPS_MAP_ID && typeof MAPS_MAP_ID === 'string' && MAPS_MAP_ID.trim().length > 0) {
            mapOptions.mapId = MAPS_MAP_ID.trim();
        }
        mapInstance.current = new google.maps.Map(mapRef.current, mapOptions);
        try {
            placesService.current = new google.maps.places.PlacesService(mapInstance.current);
            infoWindow.current = new google.maps.InfoWindow();
        } catch (e) {
            console.error('Failed to init Places/InfoWindow:', e);
        }

        // Only show businesses once after initial center
        hasLoadedBusinesses.current = false;
        const showOnce = () => {
            if (!hasLoadedBusinesses.current) {
                if (showBusinessesInBoundsRef.current) {
                    showBusinessesInBoundsRef.current();
                }
                hasLoadedBusinesses.current = true;
            }
        };
        if (useLocation) {
            programmaticMove.current = true;
            showOnce();
            setTimeout(() => { programmaticMove.current = false; }, 500);
        } else {
            // If not using geolocation, show businesses after map is ready
            programmaticMove.current = true;
            setTimeout(() => {
                showOnce();
                programmaticMove.current = false;
            }, 500);
        }

        // Listen for map drag/zoom to show update prompt (only if not programmatic)
        listeners.current.push(
            (window as any).google.maps.event.addListener(mapInstance.current, 'idle', () => {
                if (hasLoadedBusinesses.current && !programmaticMove.current) {
                    setShowUpdatePrompt(true);
                }
            })
        );

    const showBusinessesInBounds = (centerOverride?: any) => {
        if (!mapInstance.current || !placesService.current) return;
        setLoading(true);
        // Clear old markers before adding new ones
        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];
        const center = centerOverride || mapInstance.current.getCenter();
        // Use a smaller search radius for performance
        const request = {
            location: center,
            radius: 1000, // meters
            query: 'business',
        };
        placesService.current.textSearch(request, (results, status) => {
            setLoading(false);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length) {
                createMarkers(results);
                setShowUpdatePrompt(false);
            } else {
                console.warn("Places search failed or empty results:", status);
                try { createDefaultMarkers(window.google); } catch {}
            }
        });
    };
    // Expose to ref for use in Update button
    showBusinessesInBoundsRef.current = showBusinessesInBounds;



        // Autocomplete setup (only once)
        if (!autocompleteRef.current && searchInputRef.current) {
            autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
                fields: ["geometry", "name"],
            });
            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current!.getPlace();
                const query = searchInputRef.current?.value || place.name || "";
                if (place.geometry && place.geometry.location) {
                    mapInstance.current?.setCenter(place.geometry.location);
                    mapInstance.current?.setZoom(14);
                }
                performSearch({ query });
            });
        }

        // Allow the user to CLICK on map to "pick" a location
        // @ts-ignore: event typings are simplified here
        listeners.current.push(
            (window as any).google.maps.event.addListener(mapInstance.current, 'click', (e: any) => {
            const loc = e?.latLng;
            if (!loc) return;
            // Center/zoom the map to the clicked location
            programmaticMove.current = true;
            mapInstance.current!.setCenter(loc);
            mapInstance.current!.setZoom(14);
            setTimeout(() => { programmaticMove.current = false; }, 500);
            // Drop or move a selected marker
            if (selectedMarker.current) {
                selectedMarker.current.setMap(null);
            }
            selectedMarker.current = new window.google.maps.Marker({
                map: mapInstance.current!,
                position: loc,
                title: 'Selected location',
                icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                animation: window.google.maps.Animation.DROP,
                draggable: true,
            });
            // When user fine-tunes by dragging, reload nearby businesses
            selectedMarker.current.addListener('dragend', (ev: any) => {
                const newLoc = ev?.latLng || loc;
                programmaticMove.current = true;
                mapInstance.current!.setCenter(newLoc);
                // @ts-ignore center override accepted by our helper
                if (showBusinessesInBoundsRef.current) {
                    showBusinessesInBoundsRef.current(newLoc);
                }
                setTimeout(() => { programmaticMove.current = false; }, 500);
            });
            // Load nearby businesses around the chosen point
            if (showBusinessesInBoundsRef.current) {
                showBusinessesInBoundsRef.current(loc);
            }
            hasLoadedBusinesses.current = true;
            setShowUpdatePrompt(false);
    })
    );

        listeners.current.push(
            infoWindow.current.addListener('domready', () => {
            const container = document.querySelector('.map-infowindow-content');
            if (!container || container.classList.contains('click-handler-attached')) {
                return;
            }

            container.classList.add('click-handler-attached');
            container.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;

                const auditButton = target.closest('.btn-start-audit');
                if (auditButton) {
                    const name = auditButton.getAttribute('data-name');
                    const website = auditButton.getAttribute('data-website');
                    if (name) {
                        onStartAudit({
                            name: decodeURIComponent(name),
                            website: website ? decodeURIComponent(website) : undefined
                        });
                        infoWindow.current?.close();
                    }
                    return;
                }
            });
            })
        );
    };

    // Helper to show default business markers
    const createDefaultMarkers = (google: typeof window.google) => {
        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];
        const bounds = new google.maps.LatLngBounds();
        DEFAULT_BUSINESSES.forEach(biz => {
            const marker = new google.maps.Marker({
                map: mapInstance.current,
                position: biz.position,
                title: biz.name,
                animation: google.maps.Animation.DROP,
                icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            });
            marker.addListener('click', () => {
                if (!infoWindow.current) return;
                const encodedName = encodeURIComponent(biz.name);
                const encodedWebsite = encodeURIComponent(biz.website || "");
                const content = `
                    <div class="map-infowindow-content">
                        <h4>${biz.name}</h4>
                        <p>${biz.address || ''}</p>
                        <div class="map-infowindow-buttons" style="margin-top: 1rem;">
                            <button class="btn btn-primary btn-start-audit" data-name="${encodedName}" data-website="${encodedWebsite}">Start an audit</button>
                        </div>
                    </div>
                `;
                infoWindow.current.setContent(content);
                infoWindow.current.open(mapInstance.current, marker);
            });
            markers.current.push(marker);
            bounds.extend(biz.position);
        });
        if (mapInstance.current && markers.current.length > 0) {
            mapInstance.current.fitBounds(bounds);
        }
    };
    
    const performSearch = (request: google.maps.places.TextSearchRequest) => {
        if (!placesService.current || !request.query.trim()) return;
        
        updateSearchHistory(request.query);
        setHistoryVisible(false);
        if (searchInputRef.current) {
            searchInputRef.current.blur(); // Dismiss keyboard on mobile
        }

        if (!request.location) {
            request.location = mapInstance.current!.getCenter()!;
        }
        
        setLoading(true);
        placesService.current.textSearch(request, (results, status) => {
             setLoading(false);
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length) {
                createMarkers(results);
            } else {
                console.warn("Places search failed or empty results:", status);
                try { createDefaultMarkers(window.google); } catch {}
            }
        });
    };

    const handleHistoryClick = (query: string) => {
        if (searchInputRef.current) {
            searchInputRef.current.value = query;
            performSearch({ query });
        }
    };
    
    const createMarkers = (places: google.maps.places.PlaceResult[]) => {
        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];
        
        const bounds = new google.maps.LatLngBounds();

        places.forEach(place => {
            if (!place.geometry || !place.geometry.location || !place.name) return;

            const marker = new google.maps.Marker({
                map: mapInstance.current,
                position: place.geometry.location,
                title: place.name,
                animation: google.maps.Animation.DROP,
                icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            });
            
            marker.addListener('click', () => {
                if (!infoWindow.current) return;

                const encodedName = encodeURIComponent(place.name!);
                const fallbackWebsite = encodeURIComponent(place.website || '');

                const setInfo = (websiteValue: string) => {
                    const content = `
                        <div class="map-infowindow-content">
                            <h4>${place.name}</h4>
                            <p>${place.formatted_address || ''}</p>
                            <div class="map-infowindow-buttons" style="margin-top: 1rem;">
                                <button class="btn btn-primary btn-start-audit" data-name="${encodedName}" data-website="${encodeURIComponent(websiteValue)}">Start an audit</button>
                            </div>
                        </div>
                    `;
                    infoWindow.current!.setContent(content);
                    infoWindow.current!.open(mapInstance.current!, marker);
                };

                // If we have a place_id, fetch details to get website
                if (placesService.current && place.place_id) {
                    placesService.current.getDetails({ placeId: place.place_id, fields: ['website','name','formatted_address','geometry'] }, (detail, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
                            setInfo(detail.website || decodeURIComponent(fallbackWebsite));
                        } else {
                            setInfo(decodeURIComponent(fallbackWebsite));
                        }
                    });
                } else {
                    setInfo(decodeURIComponent(fallbackWebsite));
                }
            });
            
            markers.current.push(marker);
            bounds.extend(place.geometry.location);
        });
        
        if (mapInstance.current && markers.current.length > 0) {
           mapInstance.current.fitBounds(bounds);
        }
    };

    // Responsive and accessible rendering
    if (locationPermission === 'pending') {
        return (
            <div className="map-view-wrapper" style={{ minHeight: 400 }}>
                <MapLoaderFC />
                <div className="map-permission-message" aria-live="polite">
                    Please allow location access to show local businesses on the map.
                    <div style={{ marginTop: '0.75rem' }}>
                        <button className="btn btn-primary" onClick={requestLocation}>Enable my location</button>
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                        Tip: Use http://localhost (not the Network URL) so browsers allow geolocation on insecure origins.
                    </div>
                </div>
            </div>
        );
    }
    if (locationPermission === 'denied') {
        return (
            <div className="map-view-wrapper" style={{ minHeight: 400 }}>
                <MapError message="Location access denied. Showing default area. You can try again or enable location in your browser settings." />
                <div style={{ margin: '0.75rem 0' }}>
                    <button className="btn" onClick={requestLocation}>Try again</button>
                </div>
                <div ref={mapRef} className="map-container" style={{ minHeight: 350, width: '100%', borderRadius: 8 }}></div>
            </div>
        );
    }
    return (
        <div className="map-view-wrapper" style={{ minHeight: 400 }}>
            {error && <MapError message={error} />}
            {loading && <MapLoaderFC />}
            <div className="map-search-container" aria-live="polite">
                <input
                    ref={searchInputRef}
                    type="text"
                    className="map-search-input"
                    placeholder="Search for a business or location"
                    disabled={!isApiReady}
                    onFocus={() => setHistoryVisible(true)}
                    onBlur={() => {
                        setTimeout(() => setHistoryVisible(false), 200);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchInputRef.current) {
                            performSearch({ query: searchInputRef.current.value });
                        }
                    }}
                    autoComplete="off"
                    aria-label="Search for a business or location"
                />
                <button
                    className="btn"
                    style={{ marginLeft: '0.5rem' }}
                    onClick={requestLocation}
                    disabled={!isApiReady}
                    aria-label="Use my location"
                    title="Use my location"
                >
                    Use my location
                </button>
                {isHistoryVisible && searchHistory.length > 0 && (
                    <div className="search-history-dropdown" role="listbox">
                        {searchHistory.map((item, index) => (
                            <div
                                key={`${item}-${index}`}
                                className="search-history-item"
                                onMouseDown={() => handleHistoryClick(item)}
                                role="option"
                                tabIndex={0}
                                aria-selected={false}
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ position: 'relative' }}>
                <div ref={mapRef} className="map-container" style={{ minHeight: 350, width: '100%', borderRadius: 8 }}></div>
                {showUpdatePrompt && (
                    <div style={{
                        position: 'absolute',
                        top: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        background: 'rgba(255,255,255,0.95)',
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                    }}>
                        <span>Update map to show new businesses?</span>
                        <button
                            onClick={() => {
                                if (mapInstance.current && showBusinessesInBoundsRef.current) {
                                    programmaticMove.current = true;
                                    showBusinessesInBoundsRef.current();
                                    setShowUpdatePrompt(false);
                                    setTimeout(() => { programmaticMove.current = false; }, 500);
                                }
                            }}
                            style={{
                                background: '#1976d2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                padding: '6px 16px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                            aria-label="Update map to show new businesses"
                        >
                            Update
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
