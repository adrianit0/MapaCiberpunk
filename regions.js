const default_regions = [
    {
        points: "120,90 300,80 340,220 150,260",
        title: "Región Norte",
        info: "Aquí puedes mostrar población, clima, enlaces u otra información relevante."
    },
    {
        points: "420,180 620,150 700,330 500,380",
        title: "Región Central",
        info: "Información detallada de la región central del mapa."
    },
    {
        points: "200,360 390,330 430,520 240,560",
        title: "Región Sur",
        info: "Datos específicos de la región sur."
    },
    {
        points: "",
        title: "Norcal Military Base",
        info: ""
    },
    {
      points: "",
      title: "Watson Development",
      info: ""
    },
    {
        points: "",
        title: "New Westbrook",
        info: ""
    }

];

const regions = [];

function addRegion(region) {
  const requiredKeys = ["points", "title", "info"];
  const missingKeys = requiredKeys.filter((key) => !(key in region));

  if (missingKeys.length > 0) {
    throw new Error(`Faltan propiedades requeridas: ${missingKeys.join(", ")}`);
  }

  if (typeof region.points !== "string" || typeof region.title !== "string" || typeof region.info !== "string") {
    throw new Error("points, title e info deben ser strings.");
  }

  const normalized = {
    points: region.points.trim(),
    title: region.title.trim(),
    info: region.info.trim()
  };

  regions.push(normalized);
  return normalized;
}

default_regions.forEach((region) => addRegion(region));

window.Regions = {
  default_regions,
  regions,
  addRegion
};
