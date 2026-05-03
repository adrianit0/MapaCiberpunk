const LOCATION_TYPES = Object.freeze({
  CULTURE_AND_ART: "Culture & Art",
  CLUBS_AND_NIGHTLIFE: "Clubs & Nightlife",
  PERFORMING_ARTS_AND_SPORT: "Perfoming Arts and Sport",
  PUBLIC_SERVICES: "Public Services",
  OTHER: "Other",
  CORPORTATIONS: "Corportations",
  HOTELS_BARS_AND_RESTAURANTS: "Hotels bars & Restaurants",
  GANG_TERRITORIES: "Gang territories"
});

const TYPE_COLORS = Object.freeze({
  [LOCATION_TYPES.CULTURE_AND_ART]: "#ff8c00", // Naranja
  [LOCATION_TYPES.CLUBS_AND_NIGHTLIFE]: "#1e90ff", // Azul
  [LOCATION_TYPES.PERFORMING_ARTS_AND_SPORT]: "#8a2be2", // Morado
  [LOCATION_TYPES.PUBLIC_SERVICES]: "#8b4513", // Marrón
  [LOCATION_TYPES.OTHER]: "#ff0000", // Rojo
  [LOCATION_TYPES.CORPORTATIONS]: "#56bb2f", // Verde
  [LOCATION_TYPES.HOTELS_BARS_AND_RESTAURANTS]: "#00bfff", // Celeste
  [LOCATION_TYPES.GANG_TERRITORIES]: "#ffd700" // Amarillo
});

const default_locations = [
    // Corporaciones
  { x: 2125, y: 2785, reference: "1", type: LOCATION_TYPES.CORPORTATIONS, title: "Merrill, Asukaga & Finch", info: ""},
  { x: 1950, y: 2500, reference: "2", type: LOCATION_TYPES.CORPORTATIONS, title: "Raven Microcybernetics", info: ""},
  { x: 1595, y: 2255, reference: "3", type: LOCATION_TYPES.CORPORTATIONS, title: "Biotechnica Campus", info: ""},
  { x: 1285, y: 1840, reference: "4", type: LOCATION_TYPES.CORPORTATIONS, title: "Continental Brands", info: ""},
  { x: 1070, y: 1705, reference: "5", type: LOCATION_TYPES.CORPORTATIONS, title: "Danger Girl", info: ""},
  { x: 3255, y: 1895, reference: "6", type: LOCATION_TYPES.CORPORTATIONS, title: "Reo Meatwagon", info: ""},
  { x: 2968, y: 1649, reference: "7", type: LOCATION_TYPES.CORPORTATIONS, title: "Ziggurat", info: ""},
  { x: 2450, y: 180, reference: "8", type: LOCATION_TYPES.CORPORTATIONS, title: "Petrochem", info: ""},
  { x: 2288, y: 130, reference: "9", type: LOCATION_TYPES.CORPORTATIONS, title: "Sovoil", info: ""},
  { x: 1880, y: 325, reference: "10", type: LOCATION_TYPES.CORPORTATIONS, title: "Trauma Team Tower", info: ""},
  { x: 1845, y: 130, reference: "11", type: LOCATION_TYPES.CORPORTATIONS, title: "Militech", info: ""},
  { x: 3311, y: 3075, reference: "12", type: LOCATION_TYPES.CORPORTATIONS, title: "Zhirafa Office Park", info: ""},
  { x: 3205, y: 648, reference: "13", type: LOCATION_TYPES.CORPORTATIONS, title: "Network 54", info: ""},
  { x: 3530, y: 1942, reference: "14", type: LOCATION_TYPES.CORPORTATIONS, title: "Rocklin Augmentics Campus", info: ""},
  { x: 3090, y: 338, reference: "15", type: LOCATION_TYPES.CORPORTATIONS, title: "Worldsat", info: ""},

    // Otros
  { x: 1492, y: 1627, reference: "1", type: LOCATION_TYPES.OTHER, title: "Camdem Court (Solo complex)", info: ""},
  { x: 1500, y: 1680, reference: "2", type: LOCATION_TYPES.OTHER, title: "Holy Angels Church", info: ""},
  { x: 533, y: 1416, reference: "3", type: LOCATION_TYPES.OTHER, title: "Orbital Air Massdriver", info: ""},

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
