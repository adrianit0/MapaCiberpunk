const LOCATION_TYPES = Object.freeze({
  CULTURE_AND_ART: "Culture & Art",
  CLUBS_AND_NIGHTLIFE: "Clubs & Nightlife",
  PERFORMING_ARTS_AND_SPORT: "Perfoming Arts and Sport",
  PUBLIC_SERVICES: "Public Services",
  OTHER: "Other",
  CORPORATIONS: "Corportations",
  HOTELS_BARS_AND_RESTAURANTS: "Hotels bars & Restaurants",
  GANG_TERRITORIES: "Gang territories"
});

const TYPE_COLORS = Object.freeze({
  [LOCATION_TYPES.CULTURE_AND_ART]: "#ff8c00", // Naranja
  [LOCATION_TYPES.CLUBS_AND_NIGHTLIFE]: "#1e90ff", // Azul
  [LOCATION_TYPES.PERFORMING_ARTS_AND_SPORT]: "#8a2be2", // Morado
  [LOCATION_TYPES.PUBLIC_SERVICES]: "#8b4513", // Marrón
  [LOCATION_TYPES.OTHER]: "#ff0000", // Rojo
  [LOCATION_TYPES.CORPORATIONS]: "#008000", // Verde
  [LOCATION_TYPES.HOTELS_BARS_AND_RESTAURANTS]: "#00bfff", // Celeste
  [LOCATION_TYPES.GANG_TERRITORIES]: "#ffd700" // Amarillo
});

const default_locations = [
  {
    x: 3000,
    y: 1600,
    title: "POI 1 · Torre de vigilancia",
    info: "<p>Torre de vigilancia con acceso restringido y sensores de largo alcance.</p>",
    reference: "1",
    type: LOCATION_TYPES.PERFORMING_ARTS_AND_SPORT
  },
  {
    x: 570,
    y: 250,
    title: "POI 2 · Mercado negro",
    info: "<p>Zona de comercio clandestino de implantes y piezas electrónicas.</p>",
    reference: "2",
    type: LOCATION_TYPES.GANG_TERRITORIES
  },
  {
    x: 340,
    y: 450,
    title: "POI 3 · Estación energética",
    info: "<p>Nodo de distribución eléctrica de alta capacidad para el sector sur.</p>",
    reference: "3",
    type: LOCATION_TYPES.PUBLIC_SERVICES
  },
  { x: 2135, y: 2800, reference: "1", type: LOCATION_TYPES.HOTELS_BARS_AND_RESTAURANTS,
    title: "The afterlife (Solo bar)", info: ""}
];

const locations = [];

function addLocation(location) {
  const requiredKeys = ["x", "y", "title", "info", "reference", "type"];
  const missingKeys = requiredKeys.filter((key) => !(key in location));

  if (missingKeys.length > 0) {
    throw new Error(`Faltan propiedades requeridas: ${missingKeys.join(", ")}`);
  }

  if (!Number.isInteger(location.x) || !Number.isInteger(location.y)) {
    throw new Error("Las coordenadas x e y deben ser enteros.");
  }

  if (typeof location.title !== "string" || typeof location.info !== "string" || typeof location.reference !== "string") {
    throw new Error("title, info y reference deben ser strings.");
  }

  if (!Object.values(LOCATION_TYPES).includes(location.type)) {
    throw new Error("type no es válido.");
  }

  const normalized = {
    ...location,
    color: TYPE_COLORS[location.type]
  };

  locations.push(normalized);
  return normalized;
}

default_locations.forEach((location) => addLocation(location));

window.Locations = {
  LOCATION_TYPES,
  TYPE_COLORS,
  default_locations,
  locations,
  addLocation
};
