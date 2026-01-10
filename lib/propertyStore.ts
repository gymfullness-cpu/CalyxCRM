export type Property = {
  id: string;
  name: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

const KEY = "calli_properties_v1";
const EVT = "calli-properties-changed";

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVT));
}

function read(): Property[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Property[]) : [];
  } catch {
    return [];
  }
}

function write(data: Property[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
  notify();
}

export function listProperties(): Property[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createProperty(name: string, notes?: string): Property {
  const now = Date.now();
  const p: Property = {
    id: crypto.randomUUID(),
    name: name.trim(),
    notes: notes?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };
  const all = read();
  all.unshift(p);
  write(all);
  return p;
}

export function updateProperty(
  id: string,
  patch: Partial<Omit<Property, "id" | "createdAt">>
) {
  const all = read();
  const idx = all.findIndex((x) => x.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
  write(all);
}

export function deleteProperty(id: string) {
  const all = read().filter((x) => x.id !== id);
  write(all);
}

