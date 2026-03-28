import { z } from "zod";

export const coordinatesSchema = z.object({
  lat: z.number().describe("Latitude"),
  lng: z.number().describe("Longitude"),
});

const severitySchema = z.enum(["critical", "warning", "info"]);
const packPrioritySchema = z.enum(["must", "should", "nice"]);
const riskLevelSchema = z.enum(["Extreme", "High", "Elevated", "Guarded"]);

const latestNewsItemSchema = z.object({
  title: z.string().describe("Mock update title"),
  detail: z.string().describe("Mock update details"),
  ageLabel: z.string().describe("Relative freshness label"),
  severity: severitySchema.describe("Update severity"),
});

const weatherSchema = z.object({
  condition: z.string().describe("Mock weather condition"),
  temperatureC: z.number().describe("Temperature in Celsius"),
  feelsLikeC: z.number().describe("Feels-like temperature in Celsius"),
  windKph: z.number().describe("Wind speed in kilometers per hour"),
  precipitationChance: z.number().describe("Chance of precipitation from 0 to 100"),
  visibility: z.string().describe("Visibility summary"),
  impactNote: z.string().describe("How weather affects movement"),
});

const packItemSchema = z.object({
  name: z.string().describe("Item name"),
  reason: z.string().describe("Why this item matters"),
  priority: packPrioritySchema.describe("Packing priority"),
});

const nearbyPointSchema = z.object({
  name: z.string().describe("Named nearby support point"),
  kind: z.string().describe("Support point category"),
  distanceKm: z.number().describe("Mock distance in kilometers"),
  detail: z.string().describe("Support point details"),
  status: z.string().describe("Current mock status"),
});

export const emergencyBriefingPropSchema = z.object({
  title: z.string().describe("Widget title"),
  areaName: z.string().describe("Mock area name"),
  position: coordinatesSchema.describe("Requested position"),
  destinationLabel: z
    .string()
    .optional()
    .describe("Optional destination or safer location label"),
  generatedAtLabel: z.string().describe("Mock generation timestamp"),
  simulated: z.literal(true).describe("Always true because the data is mocked"),
  disclaimer: z.string().describe("Mock data disclaimer"),
  riskLevel: riskLevelSchema.describe("Overall risk level"),
  alertBanner: z.string().describe("Short emergency banner"),
  summary: z.string().describe("High-level briefing summary"),
  departureChecklist: z
    .array(z.string())
    .describe("Short checklist to review before leaving"),
  latestNews: z.array(latestNewsItemSchema).describe("Mock latest updates"),
  weather: weatherSchema.describe("Mock weather conditions"),
  whatToPack: z.array(packItemSchema).describe("Suggested items to pack"),
  movementAdvice: z.array(z.string()).describe("Movement guidance"),
  survivalNotes: z.array(z.string()).describe("Short survival reminders"),
  communicationPlan: z.array(z.string()).describe("Communication guidance"),
  nearbyPoints: z.array(nearbyPointSchema).describe("Nearby support options"),
});

export type Coordinates = z.infer<typeof coordinatesSchema>;
export type EmergencyBriefingProps = z.infer<typeof emergencyBriefingPropSchema>;
export type EmergencyRiskLevel = z.infer<typeof riskLevelSchema>;
export type EmergencyNewsSeverity = z.infer<typeof severitySchema>;
export type PackPriority = z.infer<typeof packPrioritySchema>;

type SeededRandom = () => number;

type NewsTemplate = {
  title: string;
  detail: string;
  severity: EmergencyNewsSeverity;
};

type NearbyPointTemplate = {
  name: string;
  kind: string;
  detail: string;
  status: string;
};

const AREA_CALLSIGNS = [
  "Kestrel",
  "Harbor",
  "Cedar",
  "Atlas",
  "River",
  "Pioneer",
  "Lantern",
  "Summit",
];

const WEATHER_CONDITIONS = [
  "Cold rain",
  "Windy overcast",
  "Dry haze",
  "Broken clouds",
  "Heavy showers",
  "Dusty gusts",
  "Clear but cold",
  "Humid drizzle",
];

const VISIBILITY_LABELS = [
  "Poor below 800 m",
  "Limited around 1.2 km",
  "Fair around 3 km",
  "Moderate around 5 km",
];

const NEWS_TEMPLATES: NewsTemplate[] = [
  {
    title: "Checkpoint pattern changed",
    detail: "A new screening point is reported on the main eastbound road. Expect delays and rerouting.",
    severity: "warning",
  },
  {
    title: "Aid corridor briefly open",
    detail: "Movement appears easier on side streets for a short window before evening congestion builds.",
    severity: "info",
  },
  {
    title: "Communications unstable",
    detail: "Cellular coverage is intermittent. Do not rely on live navigation or messaging alone.",
    severity: "critical",
  },
  {
    title: "Medical queue building",
    detail: "The nearest treatment point is operating but wait times are increasing through the afternoon.",
    severity: "warning",
  },
  {
    title: "Power outages spreading",
    detail: "Rolling outages are affecting lights, charging access, and payment systems across nearby blocks.",
    severity: "critical",
  },
  {
    title: "Water distribution active",
    detail: "A temporary water point is open with moderate queues and limited container availability.",
    severity: "info",
  },
  {
    title: "Traffic funnel identified",
    detail: "The main boulevard is drawing vehicles into a narrow choke point. Smaller streets are safer for movement.",
    severity: "warning",
  },
  {
    title: "Night movement worsening",
    detail: "Visibility and confidence drop sharply after dusk. Plan movement earlier and keep route choices simple.",
    severity: "critical",
  },
];

const NEARBY_POINT_TEMPLATES: NearbyPointTemplate[] = [
  {
    name: "Shelter corridor",
    kind: "Shelter",
    detail: "Low-profile indoor shelter option with basic seating and cover from weather.",
    status: "Busy but usable",
  },
  {
    name: "Water point",
    kind: "Water",
    detail: "Small supply point with bottled water and refill access while stock lasts.",
    status: "Open",
  },
  {
    name: "Medical desk",
    kind: "Medical",
    detail: "Triage-first support point suited for minor injuries and medication questions.",
    status: "Long wait",
  },
  {
    name: "Comms corner",
    kind: "Connectivity",
    detail: "Area with better signal stability and occasional power access for charging.",
    status: "Intermittent service",
  },
  {
    name: "Transit exit lane",
    kind: "Movement",
    detail: "Safer route segment that avoids the widest traffic bottleneck in the area.",
    status: "Best before sunset",
  },
  {
    name: "Supply kiosk",
    kind: "Supplies",
    detail: "Basic food, batteries, and hygiene stock with uncertain replenishment.",
    status: "Limited stock",
  },
];

const MUST_PACK_ITEMS: EmergencyBriefingProps["whatToPack"] = [
  {
    name: "Identification and key documents",
    reason: "Keep proof of identity and critical paperwork accessible, dry, and fast to present.",
    priority: "must" as const,
  },
  {
    name: "Water and one compact food item",
    reason: "Assume movement takes longer than planned and access to stores is unreliable.",
    priority: "must" as const,
  },
  {
    name: "Phone, cable, and charged power bank",
    reason: "Short charging windows are common when power is unstable.",
    priority: "must" as const,
  },
  {
    name: "Medication and small first-aid kit",
    reason: "Immediate self-care matters when queues grow and clinics slow down.",
    priority: "must" as const,
  },
];

/**
 * Build one deterministic mock emergency briefing for a given position.
 * The same position always produces the same mock data, which keeps demos stable.
 */
export function buildMockEmergencyBriefing(
  position: Coordinates,
  options?: {
    title?: string;
    destinationLabel?: string;
  }
): EmergencyBriefingProps {
  const normalizedPosition = {
    lat: roundCoordinate(position.lat),
    lng: roundCoordinate(position.lng),
  };

  const random = createSeededRandom(normalizedPosition);
  const areaName = buildAreaName(normalizedPosition, random);
  const riskLevel = buildRiskLevel(random);
  const weather = buildWeather(normalizedPosition, random);
  const latestNews = buildLatestNews(random);
  const whatToPack = buildPackList(weather, riskLevel);
  const departureChecklist = buildDepartureChecklist(riskLevel);
  const movementAdvice = buildMovementAdvice(weather, riskLevel);
  const survivalNotes = buildSurvivalNotes(weather, riskLevel);
  const communicationPlan = buildCommunicationPlan(riskLevel);
  const nearbyPoints = buildNearbyPoints(random);

  return {
    title: options?.title ?? `Emergency move prep for ${areaName}`,
    areaName,
    position: normalizedPosition,
    destinationLabel: options?.destinationLabel,
    generatedAtLabel: buildGeneratedAtLabel(random),
    simulated: true,
    disclaimer:
      "Simulated briefing only. This widget uses mock data and must not guide real-world safety decisions.",
    riskLevel,
    alertBanner: buildAlertBanner(riskLevel),
    summary: buildSummary(riskLevel, weather, options?.destinationLabel),
    departureChecklist,
    latestNews,
    weather,
    whatToPack,
    movementAdvice,
    survivalNotes,
    communicationPlan,
    nearbyPoints,
  };
}

function buildAreaName(position: Coordinates, random: SeededRandom): string {
  const callsign = pickOne(AREA_CALLSIGNS, random);
  const latCode = Math.abs(Math.round(position.lat * 10))
    .toString()
    .padStart(3, "0");
  const lngCode = Math.abs(Math.round(position.lng * 10))
    .toString()
    .padStart(3, "0");
  const hemisphere = position.lat >= 0 ? "North" : "South";

  return `${callsign} ${hemisphere} Sector ${latCode}-${lngCode}`;
}

function buildRiskLevel(random: SeededRandom): EmergencyRiskLevel {
  const roll = random();

  if (roll < 0.2) {
    return "Extreme";
  }

  if (roll < 0.5) {
    return "High";
  }

  if (roll < 0.8) {
    return "Elevated";
  }

  return "Guarded";
}

function buildWeather(position: Coordinates, random: SeededRandom) {
  const latitudeFactor = 1 - Math.min(Math.abs(position.lat) / 90, 1);
  const baseTemperature = Math.round(latitudeFactor * 24 + randomInRange(random, -4, 8));
  const windKph = Math.round(randomInRange(random, 12, 42));
  const precipitationChance = Math.round(randomInRange(random, 10, 85));
  const feelsLikeAdjustment = windKph >= 30 ? -4 : precipitationChance >= 50 ? -2 : 1;

  return {
    condition: pickOne(WEATHER_CONDITIONS, random),
    temperatureC: clampNumber(baseTemperature, -8, 38),
    feelsLikeC: clampNumber(baseTemperature + feelsLikeAdjustment, -12, 40),
    windKph,
    precipitationChance,
    visibility: pickOne(VISIBILITY_LABELS, random),
    impactNote: buildWeatherImpactNote(windKph, precipitationChance),
  };
}

function buildWeatherImpactNote(windKph: number, precipitationChance: number): string {
  if (precipitationChance >= 60) {
    return "Keep outer layers waterproof. Wet conditions will slow movement and make gear harder to manage.";
  }

  if (windKph >= 30) {
    return "Expect exposed streets to feel colder and louder. Keep loose items secured and plan shorter movement segments.";
  }

  return "Weather is manageable, but keep one layer ready for fast changes and limited indoor access.";
}

function buildLatestNews(random: SeededRandom) {
  const ages = ["6 min ago", "14 min ago", "27 min ago", "42 min ago", "1 hr ago"];
  const pickedTemplates = pickUnique(NEWS_TEMPLATES, 4, random);

  return pickedTemplates.map((template, index) => ({
    ...template,
    ageLabel: ages[index],
  }));
}

function buildPackList(
  weather: EmergencyBriefingProps["weather"],
  riskLevel: EmergencyRiskLevel
) {
  const packList: EmergencyBriefingProps["whatToPack"] = [...MUST_PACK_ITEMS];

  if (weather.temperatureC <= 10 || weather.feelsLikeC <= 8) {
    packList.push({
      name: "Thermal layer and spare socks",
      reason: "Cold stress builds quickly when movement is slow or shelter is uncertain.",
      priority: "should",
    });
  }

  if (weather.precipitationChance >= 45) {
    packList.push({
      name: "Light waterproof shell or poncho",
      reason: "Dry gear stays usable longer and helps preserve warmth.",
      priority: "should",
    });
  }

  if (weather.windKph >= 28) {
    packList.push({
      name: "Eye protection and dust mask",
      reason: "Wind and debris make exposed streets harder to cross safely.",
      priority: "should",
    });
  }

  if (riskLevel === "Extreme" || riskLevel === "High") {
    packList.push({
      name: "Flashlight, whistle, and small cash reserve",
      reason: "Simple tools matter when lighting, comms, and payment systems become unreliable.",
      priority: "must",
    });
  }

  packList.push({
    name: "Small paper note with key contacts and destination",
    reason: "If the phone fails, a written fallback keeps the plan easy to share.",
    priority: "nice",
  });

  return packList.slice(0, 8);
}

function buildMovementAdvice(
  weather: EmergencyBriefingProps["weather"],
  riskLevel: EmergencyRiskLevel
): string[] {
  const advice = [
    "Move in short legs and keep the next stop obvious before leaving cover.",
    "Avoid the widest roads, traffic funnels, and any place that forces long visible crossings.",
  ];

  if (riskLevel === "Extreme") {
    advice.unshift("Only move if staying put is worse. Keep routes direct, low-profile, and reversible.");
  } else if (riskLevel === "High") {
    advice.unshift("Prefer daylight or the calmest visible window. Do not add unnecessary stops.");
  } else {
    advice.unshift("Movement looks possible, but keep enough margin to stop early if conditions shift.");
  }

  if (weather.precipitationChance >= 60) {
    advice.push("Rain will slow foot travel and reduce visibility. Protect documents before moving.");
  }

  if (weather.windKph >= 30) {
    advice.push("Wind and noise reduce awareness. Pause more often to re-check direction and surroundings.");
  }

  return advice;
}

function buildDepartureChecklist(riskLevel: EmergencyRiskLevel): string[] {
  const checklist = [
    "Put identification, medication, cash, charger, and water in the most accessible pocket.",
    "Send one short message with your planned destination, next check-in time, and battery level.",
    "Keep the bag light enough to carry continuously without needing to stop and reorganize it.",
  ];

  if (riskLevel === "Extreme" || riskLevel === "High") {
    checklist.unshift(
      "Leave only with one primary route and one fallback route. Do not improvise a longer plan on the move."
    );
  } else {
    checklist.unshift(
      "Leave during the calmest visible window, not the last possible minute."
    );
  }

  return checklist;
}

function buildSurvivalNotes(
  weather: EmergencyBriefingProps["weather"],
  riskLevel: EmergencyRiskLevel
): string[] {
  const notes = [
    "Keep essentials in one grab section of the bag so you can move without unpacking.",
    "Preserve phone battery by lowering brightness, disabling background apps, and using brief check-ins.",
    "Drink small amounts of water consistently instead of waiting until you are exhausted.",
  ];

  if (riskLevel === "Extreme" || riskLevel === "High") {
    notes.unshift("Share one fallback destination and one fallback time window with a trusted contact before moving.");
  }

  if (weather.temperatureC <= 5) {
    notes.push("Cold exposure adds up quietly. Protect hands, feet, and head first.");
  }

  return notes;
}

function buildCommunicationPlan(riskLevel: EmergencyRiskLevel): string[] {
  const plan = [
    "Send short, structured updates: location, direction of travel, next stop, and battery level.",
    "Keep one offline note with names, numbers, and a simple meeting rule if contact is lost.",
  ];

  if (riskLevel === "Extreme") {
    plan.push("Use pre-agreed phrases and avoid detailed route sharing unless absolutely necessary.");
    return plan;
  }

  plan.push("Check in at clear milestones instead of continuous messaging to conserve battery and attention.");
  return plan;
}

function buildNearbyPoints(random: SeededRandom) {
  const pickedTemplates = pickUnique(NEARBY_POINT_TEMPLATES, 4, random);

  return pickedTemplates.map((template, index) => ({
    ...template,
    distanceKm: roundDistance(randomInRange(random, 0.4 + index * 0.3, 2.6 + index * 0.4)),
  }));
}

function buildGeneratedAtLabel(random: SeededRandom): string {
  const cycle = Math.floor(randomInRange(random, 2, 9));
  const freshness = Math.floor(randomInRange(random, 4, 19));

  return `Mock refresh ${cycle} • updated ${freshness} min ago`;
}

function buildAlertBanner(riskLevel: EmergencyRiskLevel): string {
  if (riskLevel === "Extreme") {
    return "High-pressure conditions. Only move with a simple route and a clear reason.";
  }

  if (riskLevel === "High") {
    return "Conditions are unstable. Keep movement short and carry only what matters.";
  }

  if (riskLevel === "Elevated") {
    return "Stay ready to move, but avoid adding friction or extra stops to the plan.";
  }

  return "Conditions are relatively calmer, but keep a stripped-down exit plan ready.";
}

function buildSummary(
  riskLevel: EmergencyRiskLevel,
  weather: EmergencyBriefingProps["weather"],
  destinationLabel?: string
): string {
  const riskText =
    riskLevel === "Extreme"
      ? "The area is under severe pressure."
      : riskLevel === "High"
        ? "The area remains unstable."
        : riskLevel === "Elevated"
          ? "The area requires caution."
          : "The area is calmer but still fragile.";

  const weatherText =
    weather.precipitationChance >= 60
      ? "Rain is likely to complicate movement and keep gear wet."
      : weather.windKph >= 30
        ? "Strong wind will make exposed routes feel slower and less predictable."
        : "Weather is not the main constraint, but it can still shift quickly.";

  const destinationText = destinationLabel
    ? `The current plan is to move toward ${destinationLabel}.`
    : "The current plan is to move away from the area toward a safer location.";

  return `${destinationText} ${riskText} ${weatherText} Prioritize a light bag, one fallback route, and short communication bursts.`;
}

function createSeededRandom(position: Coordinates): SeededRandom {
  let seed = buildSeed(position);

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function buildSeed(position: Coordinates): number {
  const latSeed = Math.round((position.lat + 90) * 10000);
  const lngSeed = Math.round((position.lng + 180) * 10000);
  const mixed = (latSeed * 73856093) ^ (lngSeed * 19349663);

  return mixed >>> 0;
}

function pickOne<T>(items: T[], random: SeededRandom): T {
  return items[Math.floor(random() * items.length)];
}

function pickUnique<T>(items: T[], count: number, random: SeededRandom): T[] {
  const remaining = [...items];
  const selected: T[] = [];

  while (selected.length < count && remaining.length > 0) {
    const index = Math.floor(random() * remaining.length);
    const [pickedItem] = remaining.splice(index, 1);

    selected.push(pickedItem);
  }

  return selected;
}

function randomInRange(random: SeededRandom, min: number, max: number): number {
  return min + random() * (max - min);
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(4));
}

function roundDistance(value: number): number {
  return Number(value.toFixed(1));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
