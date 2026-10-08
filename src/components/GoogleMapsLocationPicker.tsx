import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, Navigation, Globe, Building2, CheckCircle2, Sparkles, Loader2, X, LocateFixed } from "lucide-react";
import { type BusinessOwnerLocation } from "@/lib/api";

type GoogleMapsLocationPickerProps = {
  value: BusinessOwnerLocation;
  onChange: (location: BusinessOwnerLocation) => void;
};

// Default center coordinates (India center: Nagphani / Nagpur)
const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;

// Dynamically inject Leaflet CSS and JS
const loadLeaflet = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if ((window as any).L_SCRIPT_LOADING) {
      const check = setInterval(() => {
        if ((window as any).L) {
          clearInterval(check);
          resolve((window as any).L);
        }
      }, 100);
      return;
    }
    (window as any).L_SCRIPT_LOADING = true;
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve((window as any).L);
    script.onerror = (err) => {
      (window as any).L_SCRIPT_LOADING = false;
      reject(err);
    };
    document.head.appendChild(script);
  });
};

export function GoogleMapsLocationPicker({ value, onChange }: GoogleMapsLocationPickerProps) {
  const googleMapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState(value.address || "");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [useLeaflet, setUseLeaflet] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);

  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);

  // Extract initial or current lat/lng
  const currentLat = typeof value.latitude === "number" && !isNaN(value.latitude) ? value.latitude : DEFAULT_LAT;
  const currentLng = typeof value.longitude === "number" && !isNaN(value.longitude) ? value.longitude : DEFAULT_LNG;

  // Helper to trigger onChange safely
  const updateLocation = useCallback(
    (newLoc: Partial<BusinessOwnerLocation>) => {
      onChange({
        address: newLoc.address !== undefined ? newLoc.address : value.address || "",
        city: newLoc.city !== undefined ? newLoc.city : value.city || "",
        state: newLoc.state !== undefined ? newLoc.state : value.state || "",
        country: newLoc.country !== undefined ? newLoc.country : value.country || "",
        pincode: newLoc.pincode !== undefined ? newLoc.pincode : value.pincode || "",
        latitude: newLoc.latitude !== undefined ? newLoc.latitude : value.latitude ?? currentLat,
        longitude: newLoc.longitude !== undefined ? newLoc.longitude : value.longitude ?? currentLng,
      });
    },
    [value, onChange, currentLat, currentLng]
  );

  // Global handler for Google Maps authentication failures
  useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps key auth failed. Automatically activating OpenStreetMap / Leaflet engine.");
      setUseLeaflet(true);
      setIsGoogleMapsLoaded(false);
      setStatusMessage("OpenStreetMap engine active.");
    };
  }, []);

  // Determine engine: check Google Maps key vs fallback
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const isDummyKey = !apiKey || apiKey.includes("AIzaSyDX-95VY_-OeTBZK9R6DUWxkcq5n_s3P6A") || apiKey.includes("YOUR_");

    if (isDummyKey) {
      setUseLeaflet(true);
      setStatusMessage("Interactive OpenStreetMap engine active.");
      return;
    }

    if (window.google?.maps) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          setIsGoogleMapsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 200);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      setIsGoogleMapsLoaded(true);
    };
    script.onerror = () => {
      setUseLeaflet(true);
      setStatusMessage("Interactive OpenStreetMap engine active.");
    };
    document.head.appendChild(script);
  }, []);

  // Helper to center Leaflet map to lat/lng
  const centerMap = useCallback((lat: number, lng: number) => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 13);
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([lat, lng]);
      }
    }
    if (googleMapRef.current && window.google?.maps) {
      const pos = new window.google.maps.LatLng(lat, lng);
      googleMapRef.current.setCenter(pos);
      if (googleMarkerRef.current) {
        googleMarkerRef.current.setPosition(pos);
      }
    }
  }, []);

  // Process Photon place object (Elasticsearch OpenStreetMap with fuzzy matching)
  const processPhotonPlace = useCallback(
    (feature: any, originalQuery?: string) => {
      if (!feature || !feature.geometry) return;

      const [lon, lat] = feature.geometry.coordinates;
      const props = feature.properties || {};

      const name = props.name || "";
      const city = props.city || props.town || props.village || props.county || props.district || name || "";
      const state = props.state || "";
      const country = props.country || "";
      const pincode = props.postcode || "";

      // Build clean formatted address
      const parts = [
        name && name !== city ? name : "",
        city,
        props.county && props.county !== city ? props.county : "",
        state,
        pincode,
        country,
      ].filter(Boolean);

      const uniqueParts: string[] = [];
      parts.forEach((p) => {
        if (!uniqueParts.includes(p)) uniqueParts.push(p);
      });

      const fullAddr = uniqueParts.join(", ") || originalQuery || "";

      setSearchQuery(fullAddr);
      setShowDropdown(false);

      updateLocation({
        address: fullAddr,
        city: city || name || value.city || "",
        state: state || value.state || "",
        country: country || value.country || "",
        pincode: pincode || value.pincode || "",
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
      });

      centerMap(lat, lon);
    },
    [updateLocation, centerMap, value.city, value.state, value.country, value.pincode]
  );

  // Process Nominatim place object (OpenStreetMap strict geocoding)
  const processNominatimPlace = useCallback(
    (item: any, originalQuery?: string) => {
      if (!item) return;

      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      const addrObj = item.address || {};

      const city =
        addrObj.city ||
        addrObj.town ||
        addrObj.village ||
        addrObj.municipality ||
        addrObj.suburb ||
        addrObj.county ||
        "";
      const state = addrObj.state || addrObj.region || "";
      const country = addrObj.country || "";
      const pincode = addrObj.postcode || "";
      const fullAddr = item.display_name || originalQuery || "";

      setSearchQuery(fullAddr);
      setShowDropdown(false);

      updateLocation({
        address: fullAddr,
        city,
        state,
        country,
        pincode,
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
      });

      centerMap(lat, lon);
    },
    [updateLocation, centerMap]
  );

  // Process Google Place object
  const processGooglePlace = useCallback(
    (place: any) => {
      if (!place || !place.geometry) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formattedAddress = place.formatted_address || place.name || "";

      let streetNumber = "";
      let route = "";
      let sublocality = "";
      let locality = "";
      let adminArea2 = "";
      let adminArea1 = "";
      let country = "";
      let postalCode = "";

      if (place.address_components) {
        for (const comp of place.address_components) {
          const types = comp.types || [];
          if (types.includes("street_number")) streetNumber = comp.long_name;
          if (types.includes("route")) route = comp.long_name;
          if (types.includes("sublocality") || types.includes("sublocality_level_1")) sublocality = comp.long_name;
          if (types.includes("locality") || types.includes("postal_town")) locality = comp.long_name;
          if (types.includes("administrative_area_level_2")) adminArea2 = comp.long_name;
          if (types.includes("administrative_area_level_1")) adminArea1 = comp.long_name;
          if (types.includes("country")) country = comp.long_name;
          if (types.includes("postal_code")) postalCode = comp.long_name;
        }
      }

      const city = locality || sublocality || adminArea2 || "";
      const state = adminArea1 || "";
      const pincode = postalCode || "";
      const finalAddress = formattedAddress || [streetNumber, route, city, state, country].filter(Boolean).join(", ");

      setSearchQuery(finalAddress);
      setShowDropdown(false);
      updateLocation({
        address: finalAddress,
        city: city || value.city || "",
        state: state || value.state || "",
        country: country || value.country || "",
        pincode: pincode || value.pincode || "",
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
      });

      centerMap(lat, lng);
    },
    [updateLocation, centerMap, value.city, value.state, value.country, value.pincode]
  );

  // Live search input change handler (queries Photon fuzzy search for instant suggestions)
  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    if (!text || text.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=6`)
      .then((res) => res.json())
      .then((data) => {
        setIsSearching(false);
        if (data?.features?.length > 0) {
          const formattedResults = data.features.map((feat: any) => {
            const props = feat.properties || {};
            const [lon, lat] = feat.geometry.coordinates;
            const name = props.name || "";
            const city = props.city || props.town || props.county || "";
            const state = props.state || "";
            const country = props.country || "";
            const label = [name, city, state, country].filter(Boolean).join(", ");
            return {
              raw: feat,
              type: "photon",
              label,
              name: name || city,
              sub: [city, state, country].filter(Boolean).join(", "),
              lat,
              lon,
            };
          });
          setSearchResults(formattedResults);
          setShowDropdown(true);
        } else {
          // Fallback to Nominatim query
          fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(text)}&limit=5`)
            .then((r) => r.json())
            .then((nomData) => {
              if (Array.isArray(nomData) && nomData.length > 0) {
                const nomFormatted = nomData.map((item: any) => ({
                  raw: item,
                  type: "nominatim",
                  label: item.display_name,
                  name: item.display_name.split(",")[0],
                  sub: item.display_name,
                  lat: parseFloat(item.lat),
                  lon: parseFloat(item.lon),
                }));
                setSearchResults(nomFormatted);
                setShowDropdown(true);
              } else {
                setSearchResults([]);
                setShowDropdown(false);
              }
            })
            .catch(() => setShowDropdown(false));
        }
      })
      .catch(() => {
        setIsSearching(false);
        setSearchResults([]);
      });
  };

  // Selection from dropdown
  const handleSelectResult = (item: any) => {
    if (item.type === "photon") {
      processPhotonPlace(item.raw);
    } else {
      processNominatimPlace(item.raw);
    }
  };

  // Reverse geocoding from Lat/Lng
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.features?.length > 0) {
            processPhotonPlace(data.features[0]);
            return;
          }
        }

        const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`).catch(() => null);
        if (nomRes && nomRes.ok) {
          const nomData = await nomRes.json().catch(() => null);
          if (nomData) {
            processNominatimPlace(nomData);
            return;
          }
        }

        updateLocation({
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        });
      } catch (err) {
        updateLocation({
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        });
      }
    },
    [processPhotonPlace, processNominatimPlace, updateLocation]
  );

  // Main geocode search (handles typos like "rajamudry", "vizag", addresses, cities, etc.)
  const geocodeAddress = useCallback(
    async (addressStr: string) => {
      if (!addressStr || !addressStr.trim()) return;

      setIsGeocoding(true);
      setStatusMessage(`Locating "${addressStr}"...`);

      try {
        // Step 1: Query Photon (Elasticsearch fuzzy geocoder - handles typos like 'rajamudry')
        const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(addressStr)}&limit=5`).catch(() => null);
        if (photonRes && photonRes.ok) {
          const photonData = await photonRes.json().catch(() => null);
          if (photonData?.features?.length > 0) {
            setIsGeocoding(false);
            setStatusMessage(null);
            processPhotonPlace(photonData.features[0], addressStr);
            return;
          }
        }

        // Step 2: Query Nominatim
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(addressStr)}&limit=5`).catch(() => null);
        if (nomRes && nomRes.ok) {
          const nomData = await nomRes.json().catch(() => null);
          if (Array.isArray(nomData) && nomData.length > 0) {
            setIsGeocoding(false);
            setStatusMessage(null);
            processNominatimPlace(nomData[0], addressStr);
            return;
          }
        }

        // Step 3: Retry with appended country if missing (e.g. "rajamudry, India")
        if (!addressStr.toLowerCase().includes("india")) {
          const retryRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(addressStr + ", India")}&limit=5`).catch(() => null);
          if (retryRes && retryRes.ok) {
            const retryData = await retryRes.json().catch(() => null);
            if (retryData?.features?.length > 0) {
              setIsGeocoding(false);
              setStatusMessage(null);
              processPhotonPlace(retryData.features[0], addressStr);
              return;
            }
          }
        }

        setIsGeocoding(false);
        setStatusMessage(`Could not find exact coordinates for "${addressStr}". Click on the map to set location.`);
      } catch (err) {
        setIsGeocoding(false);
        setStatusMessage(`Geocoding request failed. Please click map to pick pin location.`);
      }
    },
    [processPhotonPlace, processNominatimPlace]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (useLeaflet && leafletMapContainerRef.current) {
      loadLeaflet().then((L) => {
        if (!leafletMapContainerRef.current) return;

        if (!leafletMapRef.current) {
          const map = L.map(leafletMapContainerRef.current, {
            center: [currentLat, currentLng],
            zoom: 13,
            zoomControl: true,
          });
          leafletMapRef.current = map;

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(map);

          const customIcon = L.divIcon({
            className: "custom-leaflet-pin",
            html: `<div style="
              background: #0284c7;
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              border: 2.5px solid #ffffff;
            ">
              <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          const marker = L.marker([currentLat, currentLng], {
            draggable: true,
            icon: customIcon,
          }).addTo(map);
          leafletMarkerRef.current = marker;

          marker.on("dragend", (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            reverseGeocode(lat, lng);
          });

          map.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            reverseGeocode(lat, lng);
          });

          setTimeout(() => {
            map.invalidateSize();
          }, 250);
        } else {
          leafletMapRef.current.setView([currentLat, currentLng], leafletMapRef.current.getZoom());
          if (leafletMarkerRef.current) {
            leafletMarkerRef.current.setLatLng([currentLat, currentLng]);
          }
        }
      });
    }
  }, [useLeaflet, currentLat, currentLng, reverseGeocode]);

  // Submit search box
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      geocodeAddress(searchQuery);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-border/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span>Interactive Location Picker</span>
        </div>
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {useLeaflet ? "OpenStreetMap Active" : "Google Maps Active"}
        </span>
      </div>

      {/* Search Bar with Live Autocomplete Suggestions */}
      <div className="relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search address, city (e.g. rajamudry, palasa), or landmark..."
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
            className="pl-9 pr-24 bg-background border-border text-xs"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isGeocoding}
              className="px-2.5 py-1 text-[11px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1"
            >
              {isGeocoding || isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
            </button>
          </div>
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto divide-y divide-border/50">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground flex items-start gap-2 transition-colors"
                onClick={() => handleSelectResult(item)}
              >
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="truncate">
                  <p className="font-medium text-foreground text-xs">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map Container */}
      <div className="relative rounded-xl border border-border overflow-hidden bg-card shadow-inner h-52">
        {useLeaflet ? (
          <div ref={leafletMapContainerRef} className="h-full w-full z-0" />
        ) : (
          <div ref={googleMapContainerRef} className="h-full w-full z-0" />
        )}
      </div>

      {statusMessage && (
        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 justify-end">
          <Sparkles className="h-3 w-3 text-sky-500 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Auto-Populated Location Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="loc-address" className="text-xs flex items-center gap-1">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              Full Formatted Address *
            </Label>
            <button
              type="button"
              onClick={() => {
                if (value.address && value.address.trim()) {
                  geocodeAddress(value.address);
                }
              }}
              className="text-[10px] text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <LocateFixed className="h-3 w-3" /> Locate Address on Map
            </button>
          </div>
          <div className="relative">
            <Input
              ref={addressInputRef}
              id="loc-address"
              placeholder="Type address or city (e.g. rajamudry, palasa)..."
              value={value.address || ""}
              onChange={(e) => {
                updateLocation({ address: e.target.value });
                setSearchQuery(e.target.value);
              }}
              onBlur={() => {
                if (value.address && value.address.trim()) {
                  geocodeAddress(value.address);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (value.address && value.address.trim()) {
                    geocodeAddress(value.address);
                  }
                }
              }}
              className="text-xs bg-background pr-16"
            />
            <button
              type="button"
              disabled={isGeocoding}
              onClick={() => {
                if (value.address && value.address.trim()) {
                  geocodeAddress(value.address);
                }
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded"
            >
              Locate
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="loc-city" className="text-xs">
            City (Auto-filled)
          </Label>
          <Input
            id="loc-city"
            placeholder="e.g. Rajamahendravaram"
            value={value.city || ""}
            onChange={(e) => updateLocation({ city: e.target.value })}
            className="text-xs bg-background"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="loc-state" className="text-xs">
            State / Region (Auto-filled)
          </Label>
          <Input
            id="loc-state"
            placeholder="e.g. Andhra Pradesh"
            value={value.state || ""}
            onChange={(e) => updateLocation({ state: e.target.value })}
            className="text-xs bg-background"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="loc-country" className="text-xs flex items-center gap-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            Country (Auto-filled)
          </Label>
          <Input
            id="loc-country"
            placeholder="e.g. India"
            value={value.country || ""}
            onChange={(e) => updateLocation({ country: e.target.value })}
            className="text-xs bg-background"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="loc-pincode" className="text-xs">
            Pincode / Postal Code (Auto-filled)
          </Label>
          <Input
            id="loc-pincode"
            placeholder="e.g. 533100"
            value={value.pincode || ""}
            onChange={(e) => updateLocation({ pincode: e.target.value })}
            className="text-xs bg-background"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="loc-lat" className="text-xs flex items-center gap-1">
            <Navigation className="h-3 w-3 text-muted-foreground" />
            Latitude (Auto-filled)
          </Label>
          <Input
            id="loc-lat"
            type="number"
            step="any"
            placeholder="17.005045"
            value={value.latitude !== undefined && value.latitude !== null ? value.latitude : ""}
            onChange={(e) => updateLocation({ latitude: e.target.value ? parseFloat(e.target.value) : null })}
            className="text-xs bg-background font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="loc-lng" className="text-xs flex items-center gap-1">
            <Navigation className="h-3 w-3 text-muted-foreground" />
            Longitude (Auto-filled)
          </Label>
          <Input
            id="loc-lng"
            type="number"
            step="any"
            placeholder="81.780473"
            value={value.longitude !== undefined && value.longitude !== null ? value.longitude : ""}
            onChange={(e) => updateLocation({ longitude: e.target.value ? parseFloat(e.target.value) : null })}
            className="text-xs bg-background font-mono"
          />
        </div>
      </div>
    </div>
  );
}
