const locationTypes = [];
const typeColors = {};
const typeNamesById = {};

const DEFAULT_LOCATION_TYPES = Object.freeze({
  CULTURE_AND_ART: "Culture & Art",
  CLUBS_AND_NIGHTLIFE: "Clubs & Nightlife",
  PERFORMING_ARTS_AND_SPORT: "Perfoming Arts and Sport",
  PUBLIC_SERVICES: "Public Services",
  OTHER: "Other",
  CORPORTATIONS: "Corportations",
  HOTELS_BARS_AND_RESTAURANTS: "Hotels bars & Restaurants",
  GANG_TERRITORIES: "Gang territories"
});

const DEFAULT_TYPE_COLORS = Object.freeze({
  [DEFAULT_LOCATION_TYPES.CULTURE_AND_ART]: "#ee4922", // Naranja
  [DEFAULT_LOCATION_TYPES.CLUBS_AND_NIGHTLIFE]: "#224ba0", // Azul
  [DEFAULT_LOCATION_TYPES.PERFORMING_ARTS_AND_SPORT]: "#963794", // Morado
  [DEFAULT_LOCATION_TYPES.PUBLIC_SERVICES]: "#69210f", // Marrón
  [DEFAULT_LOCATION_TYPES.OTHER]: "#d61d24", // Rojo
  [DEFAULT_LOCATION_TYPES.CORPORTATIONS]: "#049347", // Verde
  [DEFAULT_LOCATION_TYPES.HOTELS_BARS_AND_RESTAURANTS]: "#00b09a", // Celeste
  [DEFAULT_LOCATION_TYPES.GANG_TERRITORIES]: "#f1e904" // Amarillo
});

const default_locations = [
  // CULTURE & ART
  { x: 1172, y: 2475, reference: "1", type: "Culture & Art", title: "Night City University", info: "" },
  { x: 1178, y: 2295, reference: "2", type: "Culture & Art", title: "NCU Fine Arts Campus", info: "" },
  { x: 1255, y: 2225, reference: "3", type: "Culture & Art", title: "Serengeti Gallery", info: "" },

  // CLUBS & NIGHTLIFE
  { x: 2275, y: 2512, reference: "1", type: "Clubs & Nightlife", title: "The Atlantis (Night Club)", info: "" },
  { x: 1528, y: 3387, reference: "2", type: "Clubs & Nightlife", title: "The Slammer (Booster Club & Arena)", info: "" },
  { x: 1754, y: 2611, reference: "3", type: "Clubs & Nightlife", title: "Smash/Cut (EDM)", info: "" },
  { x: 1919, y: 2635, reference: "4", type: "Clubs & Nightlife", title: "Bella Mia (Fashion Hub)", info: "" },
  { x: 2835, y: 1790, reference: "5", type: "Clubs & Nightlife", title: "Chatelaine's", info: "" },
  { x: 1418, y: 2500, reference: "6", type: "Clubs & Nightlife", title: "Night City Symphony Hall", info: "" },
  { x: 1450, y: 2590, reference: "7", type: "Clubs & Nightlife", title: "Mindnutz Lover (Braindance Club)", info: "" },
  { x: 1275, y: 2170, reference: "8", type: "Clubs & Nightlife", title: "Delirium (Virtuality Club)", info: "" },

  // PERFORMING ARTS AND SPORT
  { x: 2805, y: 2445, reference: "1", type: "Perfoming Arts and Sport", title: "Colonial Studios (TV and Movie Production)", info: "" },
  { x: 1065, y: 2357, reference: "2", type: "Perfoming Arts and Sport", title: "Biograph Theater (Cinema)", info: "" },
  { x: 2563, y: 1717, reference: "3", type: "Perfoming Arts and Sport", title: "Cinemaxus (Cinema & Brain Dance)", info: "" },
  { x: 2585, y: 1660, reference: "4", type: "Perfoming Arts and Sport", title: "McCartney Field Stadium", info: "" },
  { x: 2775, y: 1462, reference: "5", type: "Perfoming Arts and Sport", title: "Yacht Club", info: "" },
  { x: 1550, y: 2770, reference: "6", type: "Perfoming Arts and Sport", title: "Redline (MMA Venue)", info: "" },
  { x: 1465, y: 2455, reference: "7", type: "Perfoming Arts and Sport", title: "Night City Symphony Hall", info: "" },
  { x: 1666, y: 2530, reference: "8", type: "Perfoming Arts and Sport", title: "Night City Plaza (Outdoor Theater and Concerts)", info: "" },

  // PUBLIC SERVICES
  { x: 1840, y: 2780, reference: "1", type: "Public Services", title: "1st Night City Bank", info: "" },
  { x: 2130, y: 3165, reference: "2", type: "Public Services", title: "City Hall", info: "" },
  { x: 2305, y: 2675, reference: "3", type: "Public Services", title: "City Police Precinct 1", info: "" },
  { x: 2568, y: 3960, reference: "4", type: "Public Services", title: "City Police Precinct 2", info: "" },
  { x: 1880, y: 735, reference: "5", type: "Public Services", title: "City Police Precinct 3", info: "" },
  { x: 2280, y: 2958, reference: "6", type: "Public Services", title: "Hall of Justice", info: "" },
  { x: 3795, y: 2015, reference: "7", type: "Public Services", title: "Night City Fire Station 1", info: "" },
  { x: 1075, y: 1880, reference: "8", type: "Public Services", title: "Night City Fire Station 2", info: "" },
  { x: 2710, y: 2047, reference: "9", type: "Public Services", title: "City Medical Center", info: "" },
  { x: 2440, y: 2395, reference: "10", type: "Public Services", title: "Crisis Medical Center", info: "" },
  { x: 1066, y: 2270, reference: "11", type: "Public Services", title: "Stuart Hospital", info: "" },
  { x: 1725, y: 2075, reference: "12", type: "Public Services", title: "West Hill Library", info: "" },
  { x: 2630, y: 1705, reference: "13", type: "Public Services", title: "Night City Postal Service", info: "" },
  { x: 2600, y: 1435, reference: "14", type: "Public Services", title: "Ferry Building", info: "" },
  { x: 1045, y: 2760, reference: "15", type: "Public Services", title: "Medical Technologies", info: "" },
  { x: 1475, y: 2670, reference: "16", type: "Public Services", title: "Savage Docs", info: "" },
  { x: 3090, y: 2145, reference: "17", type: "Public Services", title: "Ling Po Public Library", info: "" },
  { x: 2835, y: 4560, reference: "18", type: "Public Services", title: "Rio Alto Correctional Holding Facility", info: "" },

  // OTHER
  { x: 1492, y: 1627, reference: "1", type: "Other", title: "Camdem Court (Solo complex)", info: ""},
  { x: 1500, y: 1680, reference: "2", type: "Other", title: "Holy Angels Church", info: ""},
  { x: 533, y: 1415, reference: "3", type: "Other", title: "Orbital Air Massdriver", info: "" },
  { x: 1172, y: 4034, reference: "4", type: "Other", title: "Playland by the Sea", info: "" },
  { x: 4250, y: 4430, reference: "5", type: "Other", title: "Aldecaldo Camp (Nomad Trade & Transport)", info: "" },
  { x: 1821, y: 3972, reference: "6", type: "Other", title: "Bits'n'Bolts (Salvage and Repair Shop)", info: "" },
  { x: 3110, y: 3150, reference: "7", type: "Other", title: "D.V. Rambling Rose (Fixie's Couriers)", info: "" },
  { x: 3045, y: 2185, reference: "8", type: "Other", title: "Guangbo Tower (Renovated Tower)", info: "" },
  { x: 2950, y: 4415, reference: "9", type: "Other", title: "Jack 'n' the Green (Reclaimers)", info: "" },
  { x: 2118, y: 4078, reference: "10", type: "Other", title: "RC Night Market (Night Market in an Old Mall)", info: "" },
  { x: 1550, y: 2055, reference: "11", type: "Other", title: "Torrell and Chiang's (Bespoke Tailors)", info: "" },
  { x: 905, y: 2454, reference: "12", type: "Other", title: "Stems & Seeds (Guerrilla Gardening Collective)", info: "" },
  { x: 3060, y: 1530, reference: "13", type: "Other", title: "Upper Marina Docks (Nomad Cargo Transfer)", info: "" },
  { x: 4055, y: 4037, reference: "14", type: "Other", title: "Woodchipper's Garage (Nomad Weapons Fixer)", info: "" },
  { x: 3450, y: 2978, reference: "15", type: "Other", title: "Hornet's Pharmacy (Illicit Drugs)", info: "" },
  { x: 2260, y: 2623, reference: "16", type: "Other", title: "Verdant Arms Apartments", info: "" },


  // HOTELS, BARS & RESTAURANTS
  { x: 2590, y: 1772, reference: "1", type: "Hotels bars & Restaurants", title: "The Afterlife (Solo Bar)", info: "" },
  { x: 2725, y: 2247, reference: "2", type: "Hotels bars & Restaurants", title: "Highcourt Plaza Hotel", info: "" },
  { x: 2130, y: 1700, reference: "3", type: "Hotels bars & Restaurants", title: "Totentanz (Booster Bar)", info: "" },
  { x: 3190, y: 2326, reference: "4", type: "Hotels bars & Restaurants", title: "The Forlorn Hope (Solo Bar)", info: "" },
  { x: 1066, y: 2608, reference: "5", type: "Hotels bars & Restaurants", title: "The Paragon (Student Bar)", info: "" },
  { x: 1727, y: 1969, reference: "6", type: "Hotels bars & Restaurants", title: "Short Circuit (Netrunner's Bar)", info: "" },
  { x: 2027, y: 3225, reference: "7", type: "Hotels bars & Restaurants", title: "Jesse James' Kosher Deli", info: "" },
  { x: 2100, y: 3905, reference: "8", type: "Hotels bars & Restaurants", title: "Metalstorm (Chromer Bar)", info: "" },
  { x: 2736, y: 2297, reference: "9", type: "Hotels bars & Restaurants", title: "Red Door Inn", info: "" },
  { x: 1553, y: 1785, reference: "10", type: "Hotels bars & Restaurants", title: "Knight-Marriot Hotel", info: "" },
  { x: 2352, y: 2450, reference: "11", type: "Hotels bars & Restaurants", title: "Yamagumi Hotel", info: "" },
  { x: 1500, y: 1845, reference: "12", type: "Hotels bars & Restaurants", title: "Francini's Café (European Cuisine)", info: "" },
  { x: 3151, y: 2009, reference: "13", type: "Hotels bars & Restaurants", title: "24 Hour Café (Truck Stop)", info: "" },
  { x: 2700, y: 1631, reference: "14", type: "Hotels bars & Restaurants", title: "American Bar (Sandwiches)", info: "" },
  { x: 2115, y: 1560, reference: "15", type: "Hotels bars & Restaurants", title: "Metropolitan Barbecue & Grill (Steak House)", info: "" },
  { x: 1162, y: 2613, reference: "16", type: "Hotels bars & Restaurants", title: "McDonnell's (Fast Food)", info: "" },
  { x: 1067, y: 2510, reference: "17", type: "Hotels bars & Restaurants", title: "Metro Café", info: "" },
  { x: 2633, y: 2456, reference: "18", type: "Hotels bars & Restaurants", title: "Chen's Oriental Garden (Chinese)", info: "" },
  { x: 2870, y: 2556, reference: "19", type: "Hotels bars & Restaurants", title: "The Silver Dragon (Chinese)", info: "" },
  { x: 1735, y: 1685, reference: "20", type: "Hotels bars & Restaurants", title: "Fiddler's Green (Irish Pub)", info: "" },
  { x: 1195, y: 2187, reference: "21", type: "Hotels bars & Restaurants", title: "Kasim's (Coffee)", info: "" },
  { x: 2395, y: 2620, reference: "22", type: "Hotels bars & Restaurants", title: "Sakura's (Sake)", info: "" },
  { x: 1751, y: 2875, reference: "23", type: "Hotels bars & Restaurants", title: "Greta's (Pool Hall)", info: "" },
  { x: 2520, y: 2780, reference: "24", type: "Hotels bars & Restaurants", title: "Chopper's (Tech Hang)", info: "" },
  { x: 1594, y: 2139, reference: "25", type: "Hotels bars & Restaurants", title: "Red Oktober (Russian)", info: "" },
  { x: 2956, y: 1992, reference: "26", type: "Hotels bars & Restaurants", title: "Bear's (Burger Pub)", info: "" },
  { x: 1075, y: 3415, reference: "27", type: "Hotels bars & Restaurants", title: "The Randy Dandy (Salvagers)", info: "" },
  { x: 2075, y: 745, reference: "28", type: "Hotels bars & Restaurants", title: "Yun Seng (Cantonese)", info: "" },
  { x: 1205, y: 2370, reference: "29", type: "Hotels bars & Restaurants", title: "Yeutree (Hipster)", info: "" },
  { x: 2678, y: 1829, reference: "30", type: "Hotels bars & Restaurants", title: "Aire (Oxygen Bar)", info: "" },
  { x: 1150, y: 3325, reference: "31", type: "Hotels bars & Restaurants", title: "Rusty's Dive Shack (Salvagers)", info: "" },
  { x: 3342, y: 1873, reference: "32", type: "Hotels bars & Restaurants", title: "Maria's (Nomads)", info: "" },
  { x: 2483, y: 2970, reference: "33", type: "Hotels bars & Restaurants", title: "Buffalo's (Cursed!)", info: "" },
  { x: 2757, y: 1756, reference: "34", type: "Hotels bars & Restaurants", title: "Anjelika's (Cyberphiles)", info: "" },
  { x: 2978, y: 1730, reference: "35", type: "Hotels bars & Restaurants", title: "La Lune Bleue (French)", info: "" },
  { x: 1163, y: 2422, reference: "36", type: "Hotels bars & Restaurants", title: "Food Truck Plaza (Street Food)", info: "" },
  { x: 1280, y: 4390, reference: "37", type: "Hotels bars & Restaurants", title: "Mister Rice Guy (24 Hr Automated Sushi)", info: "" },
  { x: 4043, y: 4408, reference: "38", type: "Hotels bars & Restaurants", title: "Red Dirt (Nomad Bar)", info: "" },

    // Corporaciones
  { x: 2125, y: 2785, reference: "1", type: "Corportations", title: "Merrill, Asukaga & Finch", info: ""},
  { x: 1950, y: 2500, reference: "2", type: "Corportations", title: "Raven Microcybernetics", info: ""},
  { x: 1595, y: 2255, reference: "3", type: "Corportations", title: "Biotechnica Campus", info: ""},
  { x: 1285, y: 1840, reference: "4", type: "Corportations", title: "Continental Brands", info: ""},
  { x: 1070, y: 1705, reference: "5", type: "Corportations", title: "Danger Girl", info: ""},
  { x: 3255, y: 1895, reference: "6", type: "Corportations", title: "Reo Meatwagon", info: ""},
  { x: 2968, y: 1649, reference: "7", type: "Corportations", title: "Ziggurat", info: ""},
  { x: 2450, y: 180, reference: "8", type: "Corportations", title: "Petrochem", info: ""},
  { x: 2288, y: 130, reference: "9", type: "Corportations", title: "Sovoil", info: ""},
  { x: 1880, y: 325, reference: "10", type: "Corportations", title: "Trauma Team Tower", info: ""},
  { x: 1845, y: 130, reference: "11", type: "Corportations", title: "Militech", info: ""},
  { x: 3311, y: 3075, reference: "12", type: "Corportations", title: "Zhirafa Office Park", info: ""},
  { x: 3205, y: 648, reference: "13", type: "Corportations", title: "Network 54", info: ""},
  { x: 3530, y: 1942, reference: "14", type: "Corportations", title: "Rocklin Augmentics Campus", info: ""},
  { x: 3090, y: 338, reference: "15", type: "Corportations", title: "Worldsat", info: ""},

];

const locations = [];
let nextLocationId = 1;
let isLoaded = false;
let loadPromise = null;

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.locations)) return response.locations;
  if (Array.isArray(response?.location)) return response.location;
  if (Array.isArray(response?.types)) return response.types;
  if (Array.isArray(response?.locationTypes)) return response.locationTypes;
  if (Array.isArray(response?.location_types)) return response.location_types;
  return [];
}

function getTypeName(type) {
  return type?.name ?? type?.title ?? type?.type ?? type?.label ?? type?.value ?? null;
}

function getTypeColor(type) {
  return type?.color ?? type?.colour ?? type?.hex ?? type?.hex_color ?? type?.marker_color ?? null;
}

function setLocationTypes(serverTypes) {
  locationTypes.length = 0;
  Object.keys(typeColors).forEach((type) => delete typeColors[type]);
  Object.keys(typeNamesById).forEach((id) => delete typeNamesById[id]);

  unwrapList(serverTypes).forEach((type) => {
    const name = getTypeName(type);
    if (!name || locationTypes.includes(name)) return;

    locationTypes.push(name);
    if (type.id != null) {
      typeNamesById[String(type.id)] = name;
    }
    const color = getTypeColor(type);
    if (color) {
      typeColors[name] = color;
    }
  });
}

function normalizeServerLocation(location) {
  const rawType = location.type
    ?? location.location_type
    ?? location.location_type_id
    ?? location.locationType
    ?? location.locationTypeId
    ?? getTypeName(location.location_types)
    ?? getTypeName(location.locationTypeData);
  const type = typeof rawType === "object"
    ? getTypeName(rawType)
    : typeNamesById[String(rawType)] ?? rawType;

  return {
    id: location.id == null ? undefined : String(location.id),
    x: Number(location.x),
    y: Number(location.y),
    reference: String(location.reference ?? location.ref ?? ""),
    type,
    title: String(location.title ?? location.name ?? ""),
    info: String(location.info ?? location.description ?? ""),
    editable: location.editable ?? true
  };
}

function isKnownLocationType(type) {
  return locationTypes.includes(type);
}

function getLocationColor(type) {
  return typeColors[type] ?? "#6f42c1";
}

function resetLocations() {
  locations.length = 0;
  nextLocationId = 1;
}

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

  if (!isKnownLocationType(location.type)) {
    throw new Error("type no es válido.");
  }

  const normalized = {
    ...location,
    id: location.id ?? String(nextLocationId++),
    editable: location.editable ?? true,
    color: getLocationColor(location.type)
  };

  locations.push(normalized);
  return normalized;
}

function updateLocation(id, updates) {
  const location = locations.find((item) => item.id === id);

  if (!location) {
    throw new Error("La localización no existe.");
  }

  if (!location.editable) {
    throw new Error("Esta localización no se puede editar.");
  }

  const updated = {
    ...location,
    ...updates
  };

  const requiredKeys = ["x", "y", "title", "info", "reference", "type"];
  const missingKeys = requiredKeys.filter((key) => !(key in updated));

  if (missingKeys.length > 0) {
    throw new Error(`Faltan propiedades requeridas: ${missingKeys.join(", ")}`);
  }

  if (!Number.isInteger(updated.x) || !Number.isInteger(updated.y)) {
    throw new Error("Las coordenadas x e y deben ser enteros.");
  }

  if (typeof updated.title !== "string" || typeof updated.info !== "string" || typeof updated.reference !== "string") {
    throw new Error("title, info y reference deben ser strings.");
  }

  if (!isKnownLocationType(updated.type)) {
    throw new Error("type no es válido.");
  }

  Object.assign(location, updated, {
    id,
    editable: true,
    color: getLocationColor(updated.type)
  });

  return location;
}

function load() {
  if (isLoaded) return Promise.resolve(locations);
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    window.LlamadasAjax.getCyberLocationTypes(),
    window.LlamadasAjax.getCyberLocation()
  ])
    .then(([serverTypes, serverLocations]) => {
      setLocationTypes(serverTypes);
      resetLocations();

      default_locations.forEach((location) => addLocation({ ...location, editable: false }));
      unwrapList(serverLocations)
        .map(normalizeServerLocation)
        .filter((location) => location.type)
        .forEach((location) => addLocation(location));

      isLoaded = true;
      return locations;
    })
    .catch((error) => {
      loadPromise = null;
      throw error;
    });

  return loadPromise;
}

window.Locations = {
  default_locations,
  locationTypes,
  typeColors,
  locations,
  load,
  addLocation,
  updateLocation
};
