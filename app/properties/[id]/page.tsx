"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { Property } from "../page";
import { generatePropertyPdf } from "@/app/lib/generatePropertyPdf";

export default function PropertyDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams(); // ✅ DODANE
  const id = params.id;

  const [property, setProperty] = useState<Property | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // ✅ DODATEK: status do rubryki "Dodaj do listy dokumentów"
  const [docAdded, setDocAdded] = useState(false);

  const mapRef = useRef<any>(null);

  // Fetch property details from localStorage
  useEffect(() => {
    if (!id) return;

    const safeId = Array.isArray(id) ? id[0] : id;
    const saved = localStorage.getItem("properties");
    if (!saved) return;

    const list: Property[] = JSON.parse(saved);

    // ✅ DODATEK (NIC NIE ZMIENIA UI):
    // Synchronizacja: "properties" -> "calli_properties_v1" (dla checklist /documents/sale)
    try {
      const CALLI_KEY = "calli_properties_v1";
      const rawCalli = localStorage.getItem(CALLI_KEY);
      const calliList: any[] = rawCalli ? JSON.parse(rawCalli) : [];

      const calliMap = new Map<string, any>(calliList.map((p) => [String(p.id), p]));

      for (const p of list) {
        const pid = String((p as any).id);
        const name =
          (p as any).title ||
          `${(p as any).city ?? ""} ${(p as any).street ?? ""} ${
            (p as any).apartmentNumber ? "Nr " + (p as any).apartmentNumber : ""
          }`.trim() ||
          "Nieruchomość";

        const notes = [
          (p as any).district ? `Dzielnica: ${(p as any).district}` : "",
          (p as any).area ? `Metraż: ${(p as any).area} m²` : "",
          (p as any).price ? `Cena: ${(p as any).price} zł` : "",
        ]
          .filter(Boolean)
          .join(" • ");

        const existing = calliMap.get(pid);
        const now = Date.now();

        if (existing) {
          calliMap.set(pid, {
            ...existing,
            id: pid,
            name,
            notes,
            updatedAt: now,
          });
        } else {
          calliMap.set(pid, {
            id: pid,
            name,
            notes,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const merged = Array.from(calliMap.values()).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );

      localStorage.setItem(CALLI_KEY, JSON.stringify(merged));

      try {
        window.dispatchEvent(new Event("calli-properties-changed"));
      } catch {}
    } catch {
      // ignorujemy, nie blokujemy strony
    }

    const found = list.find((p) => String((p as any).id) === String(safeId));

    if (found) {
      setProperty(found);
    }
  }, [id]);

  // ✅ NOWE: AUTOPDF (newsletter może otworzyć /properties/[id]?autopdf=1)
  useEffect(() => {
    if (!property) return;
    const auto = searchParams?.get("autopdf");
    if (auto !== "1") return;

    // uruchom raz na wejście
    let cancelled = false;
    (async () => {
      try {
        await generatePropertyPdf(property);
      } catch {
        // nic
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [property, searchParams]);

  // ✅ DODATEK: ręczne dodanie bieżącej nieruchomości do listy dokumentów (calli_properties_v1)
  const addToDocumentsList = () => {
    if (!property) return;

    try {
      const CALLI_KEY = "calli_properties_v1";
      const raw = localStorage.getItem(CALLI_KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];

      const pid = String((property as any).id);
      const now = Date.now();

      const name =
        (property as any).title ||
        `${(property as any).city ?? ""} ${(property as any).street ?? ""} ${
          (property as any).apartmentNumber ? "Nr " + (property as any).apartmentNumber : ""
        }`.trim() ||
        "Nieruchomość";

      const notes = [
        (property as any).district ? `Dzielnica: ${(property as any).district}` : "",
        (property as any).area ? `Metraż: ${(property as any).area} m²` : "",
        (property as any).price ? `Cena: ${(property as any).price} zł` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      const idx = list.findIndex((p) => String(p.id) === pid);

      if (idx >= 0) {
        list[idx] = { ...list[idx], name, notes, updatedAt: now };
      } else {
        list.unshift({ id: pid, name, notes, createdAt: now, updatedAt: now });
      }

      localStorage.setItem(CALLI_KEY, JSON.stringify(list));

      try {
        window.dispatchEvent(new Event("calli-properties-changed"));
      } catch {}

      setDocAdded(true);
      setTimeout(() => setDocAdded(false), 1800);
    } catch {
      // nic
    }
  };

  const handleSwipe = () => {
    if (touchStartX === null || touchEndX === null) return;

    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      setActiveIndex((prev) => (prev === property!.images.length - 1 ? 0 : prev + 1));
    } else {
      setActiveIndex((prev) => (prev === 0 ? property!.images.length - 1 : prev - 1));
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleImageClick = (index: number) => {
    setActiveIndex(index);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const goToNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev === property!.images.length - 1 ? 0 : prev + 1));
  };

  const goToPreviousImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? property!.images.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (!property) return;
    if (typeof window === "undefined") return;
    let map: any = null;

    const loadMap = async () => {
      const L = (await import("leaflet")).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const query = `${property.street}, ${property.city}, Polska`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );

      const data = await res.json();
      if (!data[0]) return;

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      map = L.map("property-map").setView([lat, lon], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      L.marker([lat, lon]).addTo(map);

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    };

    loadMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [property]);

  if (!property) {
    return <div className="p-10">Brak danych</div>;
  }

  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Górna sekcja (Tytuł, Cena, Zdjęcie) */}
      <div className="mb-6 flex flex-col md:flex-row items-start">
        {/* Miniatura zdjęcia po lewej stronie */}
        <div className="relative w-full md:w-1/3 mb-6 md:mb-0">
          <img
            src={property.images[activeIndex]}
            className="w-full h-auto object-cover rounded-lg cursor-pointer"
            alt={property.title}
            onClick={() => handleImageClick(activeIndex)}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchMove={(e) => setTouchEndX(e.touches[0].clientX)}
            onTouchEnd={handleSwipe}
          />
          {property.images.length > 1 && (
            <>
              <button
                onClick={goToPreviousImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full"
              >
                ◀
              </button>

              <button
                onClick={goToNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full"
              >
                ▶
              </button>
            </>
          )}
        </div>

        {/* Tytuł i informacje o nieruchomości po prawej stronie */}
        <div className="w-full md:w-2/3">
          {/* ✅ FIX KOLORÓW: tytuł biały na ciemnym tle */}
          <h1 className="text-2xl md:text-3xl font-semibold text-white text-right">
            {property.title}
          </h1>

          <div className="flex space-x-8 mt-4 justify-end">
            <div className="flex flex-col items-end">
              {/* ✅ FIX: jaśniejszy szary */}
              <p className="text-lg text-gray-300">
                📍 {property.city}, {property.district}, {property.street}{" "}
                {property.apartmentNumber && `Nr ${property.apartmentNumber}`}
              </p>
              <p className="text-lg text-gray-300">
                📐 {property.area} m² | 📅 {property.year}
              </p>
            </div>
          </div>

          <div className="flex space-x-8 mt-4 justify-end">
            <div>
              <div className="text-sm text-gray-300 mb-1">Cena</div>
              {/* ✅ FIX: cena biała */}
              <div className="text-3xl font-bold text-white">
                {property.price.toLocaleString()} zł
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-300 mb-1">Cena za m²</div>
              {/* ✅ FIX: dodaj kolor */}
              <div className="text-2xl font-semibold text-white">
                {(property.price / property.area).toLocaleString()} zł
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await generatePropertyPdf(property);
                }}
                className="rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold shadow hover:bg-blue-700 transition"
              >
                Pobierz PDF dla klienta
              </button>
            </div>
          </div>

          {/* ✅ NOWA RUBRYKA: Dodaj do listy dokumentów */}
          <div className="mt-5 flex justify-end">
            <div className="w-full md:w-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-5 py-4">
              <div className="font-semibold text-white mb-2">
                📄 Dodaj do listy dokumentów
              </div>
              <div className="text-sm text-gray-300 mb-3">
                Dzięki temu nieruchomość pojawi się w checklistach dokumentów (np. /documents/sale).
              </div>

              <div className="flex items-center gap-10 justify-end flex-wrap">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToDocumentsList();
                  }}
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-black font-semibold shadow hover:bg-emerald-400 transition"
                >
                  ➕ Dodaj / Aktualizuj na liście
                </button>

                {docAdded && (
                  <span className="text-emerald-300 font-semibold">
                    Dodano ✅
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Szczegóły nieruchomości i opis */}
      {/* ✅ FIX: na białej karcie ustawiamy ciemny tekst */}
      <div className="mt-12 bg-white text-gray-900 rounded-2xl shadow p-8 flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold mb-4 text-gray-900">📌 Szczegóły nieruchomości</h2>

          <ul className="space-y-3 text-sm text-gray-800">
            <li>📍 {property.city}, {property.district}</li>
            <li>🏠 Ulica: {property.street}</li>
            {property.apartmentNumber && (
              <li>🚪 Numer mieszkania: {property.apartmentNumber}</li>
            )}
            <li>📐 Metraż: {property.area} m²</li>
            <li>🛏 Pokoje: {property.rooms}</li>
            <li>🛁 Łazienki: {property.bathrooms}</li>
            <li>🏢 Piętro: {property.floor}</li>
            <li>📅 Rok budowy: {property.year}</li>
            <li>💰 Cena: {property.price.toLocaleString()} zł</li>
            {property.rent > 0 && <li>📄 Czynsz: {property.rent} zł</li>}
            <li>🚗 Parking: {property.parking}</li>
            {property.winda && <li>🛗 Winda</li>}
            {property.balkon && <li>🌤 Balkon</li>}
            {property.loggia && <li>🏡 Loggia</li>}
            {property.piwnica && <li>📦 Piwnica</li>}
            {property.komorka && <li>📦 Komórka lokatorska</li>}
            {property.ownership && <li>📄 Stan prawny: {property.ownership}</li>}
          </ul>
        </div>

        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold mb-4 text-gray-900">📝 Opis nieruchomości</h2>

          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {property.description}
          </p>
        </div>
      </div>

      {/* Mapa */}
      {/* ✅ FIX: biała karta ma ciemny tekst */}
      <div className="mt-12 bg-white text-gray-900 rounded-2xl shadow p-8">
        <h2 className="text-xl font-semibold mb-4">📍 Lokalizacja</h2>
        <div
          id="property-map"
          className="w-full h-[360px] rounded-2xl overflow-hidden"
        />
        <a
          href={`https://www.google.com/maps/search/?q=${encodeURIComponent(
            `${property.street}, ${property.city}`
          )}`}
          target="_blank"
          className="text-blue-500 mt-4 inline-block"
        >
          Otwórz w Google Maps
        </a>
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closePreview}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] z-10">
            <img
              src={property.images[activeIndex]}
              className="max-h-[90vh] max-w-[90vw] rounded-xl"
              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
              onTouchMove={(e) => setTouchEndX(e.touches[0].clientX)}
              onTouchEnd={handleSwipe}
            />
            {/* Prev/Next buttons */}
            <button
              onClick={goToPreviousImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full"
            >
              ◀
            </button>

            <button
              onClick={goToNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full"
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
