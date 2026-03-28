import { MCPServer, object, text, widget, type ServerConfig } from "mcp-use/server";
import { z } from "zod";
// Production runs the built server with Node ESM, so relative imports need a `.js` suffix.
import {
  buildMockEmergencyBriefing,
  coordinatesSchema,
} from "./src/emergency-briefing.js";

const markerSchema = z.object({
  lat: z.number().describe("Latitude"),
  lng: z.number().describe("Longitude"),
  title: z.string().describe("Marker title"),
  description: z.string().optional().describe("Marker description"),
  color: z.enum(["red", "blue", "green", "orange", "purple"]).optional().describe("Marker color"),
});

type Coordinates = { lat: number; lng: number };
type Marker = z.infer<typeof markerSchema>;
type RouteGuide = {
  title: string;
  summary: string;
  eta: string;
  steps: string[];
  disclaimer: string;
};
type DangerClusterBand = {
  clusterCount: number;
  incidentsPerCluster: number;
  minRadiusRatio: number;
  maxRadiusRatio: number;
  clusterSpreadRatio: number;
};
type MapState = {
  center: Coordinates;
  zoom: number;
  markers: Marker[];
  title: string;
  guide: RouteGuide;
};

const DEFAULT_MAP_TITLE = "Safety route and incident map";
const ROUTE_POINT_COUNT = 6;
const START_MARKER_TITLE = "Point A";
const DESTINATION_MARKER_TITLE = "Point B";
const DESTINATION_CODE_NAME = "Gateway X";
const CHECKPOINT_LABEL = "Checkpoint";
const MIN_DANGER_FIELD_RADIUS_KM = 60;
const DANGER_CLUSTER_BANDS: DangerClusterBand[] = [
  { clusterCount: 14, incidentsPerCluster: 10, minRadiusRatio: 0.01, maxRadiusRatio: 0.16, clusterSpreadRatio: 0.015 },
  { clusterCount: 10, incidentsPerCluster: 8, minRadiusRatio: 0.16, maxRadiusRatio: 0.38, clusterSpreadRatio: 0.025 },
  { clusterCount: 8, incidentsPerCluster: 6, minRadiusRatio: 0.38, maxRadiusRatio: 0.65, clusterSpreadRatio: 0.04 },
  { clusterCount: 6, incidentsPerCluster: 6, minRadiusRatio: 0.65, maxRadiusRatio: 1, clusterSpreadRatio: 0.07 },
];

const EMPTY_ROUTE_GUIDE: RouteGuide = {
  title: "Point A to Point B",
  summary: "Run show-map to generate a simulated route guide.",
  eta: "Simulated ETA unavailable",
  steps: ["Generate a map to create a mock route between Point A and Point B."],
  disclaimer:
    "Simulated route only. Mock data must not guide real-world movement decisions.",
};

const DANGER_EVENT_TEMPLATES = [
  {
    label: "Missile strike",
    detail: "Heavy impact. Damage and casualties reported in this sector.",
    color: "red" as const,
  },
  {
    label: "Drone attack",
    detail: "Low-altitude strike reported here. Avoid this approach.",
    color: "orange" as const,
  },
  {
    label: "Fire and destruction",
    detail: "Large fire with structural damage visible from this point.",
    color: "red" as const,
  },
  {
    label: "Casualty report",
    detail: "Emergency activity and casualties reported in the immediate area.",
    color: "orange" as const,
  },
  {
    label: "Secondary blast",
    detail: "A follow-up explosion was reported after the first strike.",
    color: "red" as const,
  },
  {
    label: "Building collapse",
    detail: "Destroyed structures and blocked movement reported here.",
    color: "orange" as const,
  },
  {
    label: "Burning vehicles",
    detail: "Vehicles are burning here. Expect smoke and heat damage.",
    color: "red" as const,
  },
  {
    label: "Strike damage",
    detail: "Widespread damage reported after repeated impacts.",
    color: "orange" as const,
  },
  {
    label: "Missile debris",
    detail: "Hazardous debris field and damage spreading across this block.",
    color: "red" as const,
  },
  {
    label: "Drone impact",
    detail: "Fresh drone impact. Damage assessment is still underway.",
    color: "orange" as const,
  },
  {
    label: "Heavy smoke",
    detail: "Dense smoke and active fire make this area unsafe.",
    color: "red" as const,
  },
  {
    label: "Casualty cluster",
    detail: "Multiple casualty alerts have been reported here.",
    color: "orange" as const,
  },
];

const DEFAULT_DESTINATION_VARIANTS: Coordinates[] = [
  { lat: -1.4, lng: 1.8 },
  { lat: 1.4, lng: 1.7 },
  { lat: -1.5, lng: -1.8 },
  { lat: 1.5, lng: -1.7 },
];

const TEHRAN_BOUNDS = {
  minLat: 35.55,
  maxLat: 35.9,
  minLng: 51.15,
  maxLng: 51.65,
};

const TEHRAN_DESTINATION_VARIANTS: Coordinates[] = [
  { lat: 1.8, lng: -0.35 },
  { lat: 1.65, lng: 0.75 },
  { lat: 1.55, lng: -1.2 },
  { lat: 1.05, lng: -1.8 },
];

const serverConfig: ServerConfig = {
  name: "maps-explorer",
  title: "Maps Explorer",
  version: "1.0.0",
  description: "Interactive maps — Leaflet in your chat",
  // Use stateless HTTP so clients can call `/mcp` directly without a prior
  // session bootstrap. This avoids "Server not initialized" errors.
  stateless: true,
  favicon: "favicon.ico",
  icons: [
    { src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] },
  ],
};

// Only pin a public base URL when one is explicitly provided.
// Otherwise let mcp-use derive the runtime origin instead of hardcoding localhost
// into widget HTML and asset URLs.
if (process.env.MCP_URL) {
  serverConfig.baseUrl = process.env.MCP_URL;
}

const server = new MCPServer(serverConfig);

let lastMapState: MapState = {
  center: { lat: 0, lng: 0 },
  zoom: 12,
  markers: [],
  title: DEFAULT_MAP_TITLE,
  guide: EMPTY_ROUTE_GUIDE,
};

const placeDatabase: Record<
  string,
  {
    population: string;
    timezone: string;
    country: string;
    funFacts: string[];
    coordinates: { lat: number; lng: number };
  }
> = {
  paris: {
    population: "2.1 million (city), 12.2 million (metro)",
    timezone: "CET (UTC+1)",
    country: "France",
    funFacts: [
      "The Eiffel Tower was originally meant to be temporary",
      "Paris has only one stop sign in the entire city",
      "There are 6,100 streets in Paris",
    ],
    coordinates: { lat: 48.8566, lng: 2.3522 },
  },
  tokyo: {
    population: "13.9 million (city), 37.4 million (metro)",
    timezone: "JST (UTC+9)",
    country: "Japan",
    funFacts: [
      "Tokyo was originally called Edo",
      "Has more Michelin-starred restaurants than any other city",
      "The Shibuya crossing sees up to 3,000 people per signal change",
    ],
    coordinates: { lat: 35.6762, lng: 139.6503 },
  },
  "new york": {
    population: "8.3 million (city), 20.1 million (metro)",
    timezone: "EST (UTC-5)",
    country: "United States",
    funFacts: [
      "Over 800 languages are spoken in NYC",
      "Central Park is larger than Monaco",
      "The subway system has 472 stations",
    ],
    coordinates: { lat: 40.7128, lng: -74.006 },
  },
  london: {
    population: "8.8 million (city), 14.3 million (metro)",
    timezone: "GMT (UTC+0)",
    country: "United Kingdom",
    funFacts: [
      "Big Ben is actually the name of the bell, not the tower",
      "London has over 170 museums",
      "The Tube is the oldest underground railway in the world",
    ],
    coordinates: { lat: 51.5074, lng: -0.1278 },
  },
  sydney: {
    population: "5.3 million",
    timezone: "AEST (UTC+10)",
    country: "Australia",
    funFacts: [
      "Sydney Opera House has over 1 million roof tiles",
      "Bondi Beach is one of the most visited beaches in the world",
      "The Harbour Bridge is the world's largest steel arch bridge",
    ],
    coordinates: { lat: -33.8688, lng: 151.2093 },
  },
  cairo: {
    population: "9.5 million (city), 21.3 million (metro)",
    timezone: "EET (UTC+2)",
    country: "Egypt",
    funFacts: [
      "Cairo is the largest city in Africa",
      "The Great Pyramid of Giza is the only ancient wonder still standing",
      "Cairo is known as 'The City of a Thousand Minarets'",
    ],
    coordinates: { lat: 30.0444, lng: 31.2357 },
  },
  "rio de janeiro": {
    population: "6.7 million (city), 13.5 million (metro)",
    timezone: "BRT (UTC-3)",
    country: "Brazil",
    funFacts: [
      "Christ the Redeemer is one of the New Seven Wonders of the World",
      "Carnival attracts 2 million people per day",
      "Sugarloaf Mountain rises 396m above the harbor",
    ],
    coordinates: { lat: -22.9068, lng: -43.1729 },
  },
  mumbai: {
    population: "12.5 million (city), 20.7 million (metro)",
    timezone: "IST (UTC+5:30)",
    country: "India",
    funFacts: [
      "Mumbai's local train system carries 7.5 million commuters daily",
      "Bollywood produces over 1,500 films per year",
      "The city was built on seven islands",
    ],
    coordinates: { lat: 19.076, lng: 72.8777 },
  },
};

function buildPositionMarker(center: Coordinates): Marker {
  return {
    lat: center.lat,
    lng: center.lng,
    title: START_MARKER_TITLE,
    description: "Blue dot. Current position and start of the simulated route.",
    color: "blue",
  };
}

function buildSafeDestination(center: Coordinates, zoom: number): Coordinates {
  const spread = getBookmarkSpread(zoom);
  const destinationVariants = isWithinTehran(center)
    ? TEHRAN_DESTINATION_VARIANTS
    : DEFAULT_DESTINATION_VARIANTS;
  const variant = destinationVariants[randomIndex(destinationVariants.length)];
  const jitterScale = isWithinTehran(center) ? 0.08 : 0.15;

  return {
    lat: clampLatitude(center.lat + variant.lat * spread.lat + randomOffset(spread.lat * jitterScale)),
    lng: normalizeLongitude(
      center.lng + variant.lng * spread.lng + randomOffset(spread.lng * jitterScale)
    ),
  };
}

function buildSafeDestinationMarker(destination: Coordinates): Marker {
  return {
    lat: destination.lat,
    lng: destination.lng,
    title: DESTINATION_MARKER_TITLE,
    description: "Purple point. Gateway X and end of the simulated route.",
    color: "purple",
  };
}

function buildSuggestedPathMarkers(center: Coordinates, destination: Coordinates): Marker[] {
  const latDistance = destination.lat - center.lat;
  const lngDistance = destination.lng - center.lng;
  const latCurve = -lngDistance * 0.08;
  const lngCurve = latDistance * 0.08;
  const markers: Marker[] = [];

  // Space green markers evenly so the route reads like one continuous path.
  for (let index = 0; index < ROUTE_POINT_COUNT; index += 1) {
    const progress = (index + 1) / (ROUTE_POINT_COUNT + 1);
    const curveStrength = progress <= 0.5 ? progress : 1 - progress;

    markers.push({
      lat: clampLatitude(center.lat + latDistance * progress + latCurve * curveStrength),
      lng: normalizeLongitude(center.lng + lngDistance * progress + lngCurve * curveStrength),
      title: `${CHECKPOINT_LABEL} ${index + 1}`,
      description:
        index === ROUTE_POINT_COUNT - 1
          ? `Final green checkpoint before ${DESTINATION_MARKER_TITLE}.`
          : `Stay on the green corridor toward ${DESTINATION_MARKER_TITLE}.`,
      color: "green",
    });
  }

  return markers;
}

function buildDangerEventMarkers(center: Coordinates, zoom: number): Marker[] {
  const fieldRadiusKm = getDangerFieldRadiusKm(zoom);
  const markers: Marker[] = [];
  let markerIndex = 0;

  // Keep the map busiest near Point A, then fan the clusters out toward the field edge.
  for (const band of DANGER_CLUSTER_BANDS) {
    const bandRotation = Math.random() * Math.PI * 2;

    for (let clusterIndex = 0; clusterIndex < band.clusterCount; clusterIndex += 1) {
      const clusterCenter = buildDangerClusterCenter(
        center,
        fieldRadiusKm,
        band,
        clusterIndex,
        bandRotation
      );

      for (let incidentIndex = 0; incidentIndex < band.incidentsPerCluster; incidentIndex += 1) {
        const template = DANGER_EVENT_TEMPLATES[markerIndex % DANGER_EVENT_TEMPLATES.length];
        const coordinates = buildClusterIncidentLocation(clusterCenter, fieldRadiusKm, band);

        markers.push(buildDangerEventMarker(center, coordinates, template, markerIndex));
        markerIndex += 1;
      }
    }
  }

  return markers;
}

function getBookmarkSpread(zoom: number): Coordinates {
  if (zoom >= 14) {
    return { lat: 0.01, lng: 0.015 };
  }

  if (zoom >= 11) {
    return { lat: 0.04, lng: 0.06 };
  }

  if (zoom >= 8) {
    return { lat: 0.12, lng: 0.18 };
  }

  return { lat: 0.35, lng: 0.5 };
}

function getDangerFieldRadiusKm(zoom: number): number {
  if (zoom <= 7) {
    return 90;
  }

  if (zoom <= 9) {
    return 80;
  }

  if (zoom <= 11) {
    return 70;
  }

  return MIN_DANGER_FIELD_RADIUS_KM;
}

function buildDangerClusterCenter(
  center: Coordinates,
  fieldRadiusKm: number,
  band: DangerClusterBand,
  clusterIndex: number,
  bandRotation: number
): Coordinates {
  const clusterAngle = getClusterAngleRadians(clusterIndex, band.clusterCount, bandRotation);
  const clusterRadiusKm = randomDistanceBetween(
    fieldRadiusKm * band.minRadiusRatio,
    fieldRadiusKm * band.maxRadiusRatio
  );

  return offsetCoordinatesByKilometers(
    center,
    Math.sin(clusterAngle) * clusterRadiusKm,
    Math.cos(clusterAngle) * clusterRadiusKm
  );
}

function getClusterAngleRadians(
  clusterIndex: number,
  clusterCount: number,
  bandRotation: number
): number {
  const baseAngle = (Math.PI * 2 * clusterIndex) / clusterCount;
  const jitter = randomSignedDistance(Math.PI / clusterCount / 2);

  return baseAngle + bandRotation + jitter;
}

function buildClusterIncidentLocation(
  clusterCenter: Coordinates,
  fieldRadiusKm: number,
  band: DangerClusterBand
): Coordinates {
  const clusterSpreadKm = fieldRadiusKm * band.clusterSpreadRatio;

  return offsetCoordinatesByKilometers(
    clusterCenter,
    randomSignedDistance(clusterSpreadKm),
    randomSignedDistance(clusterSpreadKm)
  );
}

function buildDangerEventMarker(
  center: Coordinates,
  coordinates: Coordinates,
  template: (typeof DANGER_EVENT_TEMPLATES)[number],
  markerIndex: number
): Marker {
  return {
    lat: coordinates.lat,
    lng: coordinates.lng,
    title: `${template.label} ${markerIndex + 1}`,
    description: buildDangerDescription(template.detail, center, coordinates),
    color: template.color,
  };
}

function buildDangerDescription(
  detail: string,
  center: Coordinates,
  coordinates: Coordinates
): string {
  return `${detail} Reported ${getRelativeIncidentLocationLabel(center, coordinates)}.`;
}

function getRelativeIncidentLocationLabel(
  center: Coordinates,
  coordinates: Coordinates
): string {
  const direction = getDirectionLabel(center, coordinates);
  const distanceKm = getDistanceInKilometers(center, coordinates).toFixed(1);

  if (direction === "forward") {
    return `${distanceKm} km from ${START_MARKER_TITLE}`;
  }

  return `${distanceKm} km ${direction} of ${START_MARKER_TITLE}`;
}

function offsetCoordinatesByKilometers(
  center: Coordinates,
  latOffsetKm: number,
  lngOffsetKm: number
): Coordinates {
  return {
    lat: clampLatitude(center.lat + kilometersToLatitudeDegrees(latOffsetKm)),
    lng: normalizeLongitude(center.lng + kilometersToLongitudeDegrees(lngOffsetKm, center.lat)),
  };
}

function kilometersToLatitudeDegrees(distanceKm: number): number {
  return distanceKm / 110.574;
}

function kilometersToLongitudeDegrees(distanceKm: number, latitude: number): number {
  const latitudeInRadians = (latitude * Math.PI) / 180;
  const kilometersPerDegree = 111.32 * Math.cos(latitudeInRadians);
  const safeKilometersPerDegree = Math.max(1, Math.abs(kilometersPerDegree));

  return distanceKm / safeKilometersPerDegree;
}

function getDistanceInKilometers(from: Coordinates, to: Coordinates): number {
  const averageLatitude = (from.lat + to.lat) / 2;
  const averageLatitudeInRadians = (averageLatitude * Math.PI) / 180;
  const latDistanceKm = (to.lat - from.lat) * 110.574;
  const lngDistanceKm = (to.lng - from.lng) * 111.32 * Math.cos(averageLatitudeInRadians);

  return Math.sqrt(latDistanceKm ** 2 + lngDistanceKm ** 2);
}

function randomOffset(maxDistance: number): number {
  const minDistance = maxDistance * 0.25;
  const distance = minDistance + Math.random() * (maxDistance - minDistance);
  const direction = Math.random() >= 0.5 ? 1 : -1;

  return roundCoordinate(distance * direction);
}

function randomDistanceBetween(minDistance: number, maxDistance: number): number {
  if (maxDistance <= minDistance) {
    return roundCoordinate(minDistance);
  }

  return roundCoordinate(minDistance + Math.random() * (maxDistance - minDistance));
}

function randomSignedDistance(maxDistance: number): number {
  if (maxDistance <= 0) {
    return 0;
  }

  return roundCoordinate((Math.random() * 2 - 1) * maxDistance);
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function clampLatitude(value: number): number {
  return roundCoordinate(Math.max(-85, Math.min(85, value)));
}

function normalizeLongitude(value: number): number {
  if (value > 180) {
    return roundCoordinate(value - 360);
  }

  if (value < -180) {
    return roundCoordinate(value + 360);
  }

  return roundCoordinate(value);
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

/**
 * Treat central and greater Tehran as one operating area for the simulated relocation copy.
 */
function isWithinTehran(center: Coordinates): boolean {
  if (center.lat < TEHRAN_BOUNDS.minLat || center.lat > TEHRAN_BOUNDS.maxLat) {
    return false;
  }

  if (center.lng < TEHRAN_BOUNDS.minLng || center.lng > TEHRAN_BOUNDS.maxLng) {
    return false;
  }

  return true;
}

function buildMapState(center: Coordinates, zoom: number, title: string): MapState {
  const destination = buildSafeDestination(center, zoom);
  const dangerMarkers = buildDangerEventMarkers(center, zoom);
  const routeMarkers = buildSuggestedPathMarkers(center, destination);
  const safeDestinationMarker = buildSafeDestinationMarker(destination);
  const positionMarker = buildPositionMarker(center);
  const guide = buildRouteGuide(center, destination, routeMarkers, dangerMarkers, zoom);

  // Keep danger markers below the route markers so the escape path stays visible.
  return {
    center,
    zoom,
    title,
    guide,
    markers: [...dangerMarkers, ...routeMarkers, safeDestinationMarker, positionMarker],
  };
}

// Build a short in-world route explanation that feels like a briefing, not turn-by-turn GPS.
function buildRouteGuide(
  center: Coordinates,
  destination: Coordinates,
  routeMarkers: Marker[],
  dangerMarkers: Marker[],
  zoom: number
): RouteGuide {
  if (isWithinTehran(center)) {
    return buildTehranRouteGuide(center, destination, routeMarkers, dangerMarkers, zoom);
  }

  const routeDirection = getDirectionLabel(center, destination);
  const corridorName = getCorridorName(routeDirection);
  const incidentCluster = getIncidentClusterLabel(center, dangerMarkers);
  const firstCheckpoint = routeMarkers[0]?.title ?? `${CHECKPOINT_LABEL} 1`;
  const middleCheckpoint =
    routeMarkers[Math.floor(routeMarkers.length / 2)]?.title ?? `${CHECKPOINT_LABEL} 4`;
  const finalCheckpoint =
    routeMarkers[routeMarkers.length - 1]?.title ?? `${CHECKPOINT_LABEL} ${ROUTE_POINT_COUNT}`;
  const finalApproach = getFinalApproachLabel(routeMarkers[routeMarkers.length - 1], destination);
  const eta = getSimulatedEtaLabel(zoom);

  return {
    title: "Point A to Point B",
    summary:
      `Move ${routeDirection} through the ${corridorName}, hold the green checkpoint chain, ` +
      `and finish at ${DESTINATION_MARKER_TITLE} (${DESTINATION_CODE_NAME}).`,
    eta,
    steps: [
      `Leave ${START_MARKER_TITLE} and settle into the ${corridorName}. The route trends ${routeDirection} from your starting position.`,
      `Use ${firstCheckpoint} and ${middleCheckpoint} to stay on line. Keep the ${incidentCluster} outside your direct path.`,
      `After ${finalCheckpoint}, take the ${finalApproach} final approach into ${DESTINATION_MARKER_TITLE} at ${DESTINATION_CODE_NAME}.`,
    ],
    disclaimer:
      "Simulated route only. Corridor names, checkpoints, and incident clusters are fictional and must not guide real-world movement decisions.",
  };
}

/**
 * Keep the existing guide format, but phrase it as a practical Tehran relocation case.
 */
function buildTehranRouteGuide(
  center: Coordinates,
  destination: Coordinates,
  routeMarkers: Marker[],
  dangerMarkers: Marker[],
  zoom: number
): RouteGuide {
  const routeDirection = getDirectionLabel(center, destination);
  const startZone = getTehranStartZone(center);
  const corridorName = getTehranCorridorName(routeDirection);
  const stagingZone = getTehranStagingZone(routeDirection);
  const destinationZone = getTehranDestinationZone(routeDirection);
  const incidentCluster = getIncidentClusterLabel(center, dangerMarkers);
  const firstCheckpoint = routeMarkers[0]?.title ?? `${CHECKPOINT_LABEL} 1`;
  const middleCheckpoint =
    routeMarkers[Math.floor(routeMarkers.length / 2)]?.title ?? `${CHECKPOINT_LABEL} 4`;
  const finalCheckpoint =
    routeMarkers[routeMarkers.length - 1]?.title ?? `${CHECKPOINT_LABEL} ${ROUTE_POINT_COUNT}`;
  const finalApproach = getFinalApproachLabel(routeMarkers[routeMarkers.length - 1], destination);
  const eta = getSimulatedEtaLabel(zoom);

  return {
    title: "Point A to Point B",
    summary:
      `Use this as a Tehran move case: leave ${startZone}, follow the ${corridorName}, ` +
      `and finish at ${DESTINATION_MARKER_TITLE} (${DESTINATION_CODE_NAME}) as a stand-in for ${destinationZone}.`,
    eta,
    steps: [
      `Leave ${START_MARKER_TITLE} from ${startZone} and use ${firstCheckpoint} to break into ${stagingZone}. In Tehran, the first move is to get out of the tighter inner-city belt before making a longer shift.`,
      `Use ${middleCheckpoint} to stay on line toward ${destinationZone}. Keep the ${incidentCluster} outside your direct path while you move into the more workable north or west-side receiving areas.`,
      `After ${finalCheckpoint}, take the ${finalApproach} final approach into ${DESTINATION_MARKER_TITLE} at ${DESTINATION_CODE_NAME}. Treat that handoff as entry into ${destinationZone} and stay close to larger parks, foothill edges, or lower-density streets once you arrive.`,
    ],
    disclaimer:
      "Simulated route only. Tehran zones and movement logic are illustrative and must not guide real-world movement decisions.",
  };
}

function getDirectionLabel(from: Coordinates, to: Coordinates): string {
  const latDistance = to.lat - from.lat;
  const lngDistance = to.lng - from.lng;
  const vertical = Math.abs(latDistance) < 0.002 ? "" : latDistance > 0 ? "north" : "south";
  const horizontal = Math.abs(lngDistance) < 0.002 ? "" : lngDistance > 0 ? "east" : "west";

  if (vertical && horizontal) {
    return `${vertical}-${horizontal}`;
  }

  if (vertical) {
    return vertical;
  }

  if (horizontal) {
    return horizontal;
  }

  return "forward";
}

function getCorridorName(direction: string): string {
  const corridorNames: Record<string, string> = {
    north: "north service corridor",
    "north-east": "north-east tram corridor",
    east: "east market lane",
    "south-east": "south-east canal walk",
    south: "south service corridor",
    "south-west": "south-west depot lane",
    west: "west market lane",
    "north-west": "north-west service cut-through",
    forward: "central corridor",
  };

  return corridorNames[direction] ?? "central corridor";
}

/**
 * Label the origin in the way a Tehran user would actually think about the city.
 */
function getTehranStartZone(center: Coordinates): string {
  if (center.lat <= 35.66) {
    return "south Tehran";
  }

  if (center.lat >= 35.78) {
    return "north Tehran";
  }

  if (center.lng <= 51.3) {
    return "west Tehran";
  }

  if (center.lng >= 51.48) {
    return "east Tehran";
  }

  return "central Tehran";
}

function getTehranCorridorName(direction: string): string {
  const corridorNames: Record<string, string> = {
    north: "north-central spine",
    "north-east": "north-east foothill belt",
    east: "east-to-north-east lift",
    "south-east": "north-east recovery arc",
    south: "northbound recovery spine",
    "south-west": "west-side recovery arc",
    west: "west open-space corridor",
    "north-west": "north-west hillside belt",
    forward: "inner-to-outer relief corridor",
  };

  return corridorNames[direction] ?? "inner-to-outer relief corridor";
}

function getTehranStagingZone(direction: string): string {
  const stagingZones: Record<string, string> = {
    north: "the Fatemi to Vanak transition belt",
    "north-east": "the Abbas Abad to Qeytarieh transition belt",
    east: "the Lavizan edge and north-east transition belt",
    "south-east": "the east-side lift toward the foothill belt",
    south: "the northbound transition belt above the dense core",
    "south-west": "the west-side transition belt toward Pardisan",
    west: "the Pardisan to Chitgar transition belt",
    "north-west": "the Vanak to Saadat Abad transition belt",
    forward: "the relief belt above the central core",
  };

  return stagingZones[direction] ?? "the relief belt above the central core";
}

function getTehranDestinationZone(direction: string): string {
  const destinationZones: Record<string, string> = {
    north: "Vanak, Mirdamad, and northern Abbas Abad",
    "north-east": "Qeytarieh, Farmanieh, and Niavaran",
    east: "Lavizan and the north-east edge districts",
    "south-east": "Lavizan and the north-east edge districts",
    south: "Vanak, Mirdamad, and northern Abbas Abad",
    "south-west": "Pardisan, Olympic Village, and Chitgar",
    west: "Pardisan, Olympic Village, and Chitgar",
    "north-west": "Saadat Abad, Evin, and Velenjak",
    forward: "Vanak, Saadat Abad, and the northern relief belt",
  };

  return destinationZones[direction] ?? "Vanak, Saadat Abad, and the northern relief belt";
}

function getIncidentClusterLabel(center: Coordinates, dangerMarkers: Marker[]): string {
  if (dangerMarkers.length === 0) {
    return "nearest incident sector";
  }

  const totals = dangerMarkers.reduce(
    (accumulator, marker) => ({
      lat: accumulator.lat + marker.lat,
      lng: accumulator.lng + marker.lng,
    }),
    { lat: 0, lng: 0 }
  );

  const averagePosition = {
    lat: totals.lat / dangerMarkers.length,
    lng: totals.lng / dangerMarkers.length,
  };

  const direction = getDirectionLabel(center, averagePosition);

  if (direction === "forward") {
    return "central incident cluster";
  }

  return `${direction} incident cluster`;
}

function getFinalApproachLabel(lastCheckpoint: Marker | undefined, destination: Coordinates): string {
  if (!lastCheckpoint) {
    return "direct";
  }

  const direction = getDirectionLabel(
    { lat: lastCheckpoint.lat, lng: lastCheckpoint.lng },
    destination
  );

  if (direction === "forward") {
    return "direct";
  }

  return direction;
}

function getSimulatedEtaLabel(zoom: number): string {
  if (zoom >= 14) {
    return "Simulated ETA 4 to 6 minutes on foot";
  }

  if (zoom >= 11) {
    return "Simulated ETA 8 to 11 minutes on foot";
  }

  if (zoom >= 8) {
    return "Simulated ETA 14 to 18 minutes on foot";
  }

  return "Simulated ETA 24 to 30 minutes on foot";
}

function buildRouteGuideOutput(guide: RouteGuide): string {
  return (
    `Simulated route guide from ${START_MARKER_TITLE} to ${DESTINATION_MARKER_TITLE}: ` +
    `${guide.summary} ${guide.eta}.`
  );
}

function findMarkerByName(name: string): Marker | undefined {
  const normalizedName = name.toLowerCase().trim();

  return lastMapState.markers.find(
    (marker) => marker.title.toLowerCase().trim() === normalizedName
  );
}

function buildGeneratedMarkerDetails(marker: Marker) {
  if (marker.title === START_MARKER_TITLE) {
    return {
      name: marker.title,
      population: "Not applicable",
      timezone: "Follows the timezone of the current map area",
      country: "Current position",
      funFacts: [
        marker.description ?? "Blue dot marking your current position.",
        `This is the start of the simulated route toward ${DESTINATION_MARKER_TITLE}.`,
      ],
      coordinates: { lat: marker.lat, lng: marker.lng },
    };
  }

  if (marker.title === DESTINATION_MARKER_TITLE) {
    return {
      name: marker.title,
      population: "Not applicable",
      timezone: "Follows the timezone of the current map area",
      country: "Safe destination",
      funFacts: [
        marker.description ?? "Purple point marking the suggested safest position.",
        `${DESTINATION_CODE_NAME} is the end point of the simulated route.`,
      ],
      coordinates: { lat: marker.lat, lng: marker.lng },
    };
  }

  if (marker.title.startsWith(CHECKPOINT_LABEL)) {
    return {
      name: marker.title,
      population: "Route marker",
      timezone: "Follows the timezone of the current map area",
      country: "Suggested path",
      funFacts: [
        marker.description ?? "Green checkpoint on the simulated route.",
        `Continue through the green checkpoints until you reach ${DESTINATION_MARKER_TITLE}.`,
      ],
      coordinates: { lat: marker.lat, lng: marker.lng },
    };
  }

  return {
    name: marker.title,
    population: "Incident marker",
    timezone: "Follows the timezone of the current map area",
    country: "Danger event",
    funFacts: [
      marker.description ?? "Red or orange point marking a dangerous event.",
      "These points represent strikes, fires, destruction, drone attacks, or casualties.",
    ],
    coordinates: { lat: marker.lat, lng: marker.lng },
  };
}

server.tool(
  {
    name: "show-map",
    description:
      "Show a safety map centered on a location. " +
      "Each call adds your position, one safe destination, a suggested green path, and a dense set of danger events automatically.",
    schema: z.object({
      center: z
        .object({ lat: z.number(), lng: z.number() })
        .describe("Map center coordinates"),
      zoom: z
        .number()
        .min(1)
        .max(18)
        .default(12)
        .describe("Zoom level (1=world, 18=building)"),
      title: z.string().optional().describe("Optional map title"),
    }),
    widget: {
      name: "map-view",
      invoking: "Loading map...",
      invoked: "Map ready",
    },
  },
  async ({ center, zoom, title }) => {
    const resolvedTitle = title ?? DEFAULT_MAP_TITLE;
    lastMapState = buildMapState(center, zoom, resolvedTitle);

    return widget({
      props: lastMapState,
      output: text(
        buildRouteGuideOutput(lastMapState.guide)
      ),
    });
  }
);

server.tool(
  {
    name: "get-place-details",
    description:
      "Get details about a named place — population, timezone, country, and fun facts.",
    schema: z.object({
      name: z.string().describe("Place name to look up"),
    }),
    outputSchema: z.object({
      name: z.string(),
      population: z.string(),
      timezone: z.string(),
      country: z.string(),
      funFacts: z.array(z.string()),
      coordinates: z.object({ lat: z.number(), lng: z.number() }),
    }),
  },
  async ({ name }) => {
    const key = name.toLowerCase().trim();
    const place = placeDatabase[key];

    if (place) {
      return object({
        name,
        population: place.population,
        timezone: place.timezone,
        country: place.country,
        funFacts: place.funFacts,
        coordinates: place.coordinates,
      });
    }

    const marker = findMarkerByName(name);

    if (marker) {
      return object(buildGeneratedMarkerDetails(marker));
    }

    return object({
      name,
      population: "Unknown",
      timezone: "Unknown",
      country: "Unknown",
      funFacts: [`No detailed data available for "${name}"`],
      coordinates: lastMapState.center,
    });
  }
);

server.tool(
  {
    name: "add-markers",
    description:
      "Add new markers to the current map. Merges with existing markers from the last show-map call.",
    schema: z.object({
      markers: z.array(markerSchema).describe("New markers to add to the map"),
    }),
    widget: {
      name: "map-view",
      invoking: "Adding markers...",
      invoked: "Markers added",
    },
  },
  async ({ markers: newMarkers }) => {
    lastMapState.markers = [...lastMapState.markers, ...newMarkers];

    return widget({
      props: {
        center: lastMapState.center,
        zoom: lastMapState.zoom,
        markers: lastMapState.markers,
        title: lastMapState.title,
        guide: lastMapState.guide,
      },
      output: text(
        `Added ${newMarkers.length} marker${newMarkers.length !== 1 ? "s" : ""}. ` +
          `Map now has ${lastMapState.markers.length} total markers.`
      ),
    });
  }
);

server.tool(
  {
    name: "show-emergency-briefing",
    description:
      "Use this when someone has decided to leave their current area during an emergency and needs a move-prep briefing. " +
      "It is especially useful for family-aware packing guidance, departure checklists, movement advice, and nearby support points based on the current position.",
    schema: z.object({
      position: coordinatesSchema.describe("Your current position"),
      destinationLabel: z
        .string()
        .optional()
        .describe("Optional destination or safer location label"),
      household: z
        .object({
          adults: z.array(z.string()).default([]).describe("Adults traveling together"),
          children: z.array(z.string()).default([]).describe("Children traveling together"),
        })
        .optional()
        .describe("Optional family or travel party information"),
      title: z.string().optional().describe("Optional widget title"),
    }),
    widget: {
      name: "emergency-briefing",
      invoking: "Preparing briefing...",
      invoked: "Briefing ready",
    },
  },
  async ({ position, destinationLabel, household, title }) => {
    const briefing = buildMockEmergencyBriefing(position, {
      title,
      destinationLabel,
      household,
    });

    return widget({
      props: briefing,
      output: text(
        `Move-prep briefing for ${briefing.areaName}. ` +
          `${briefing.whatToPack.length} packing items, weather ${briefing.weather.condition.toLowerCase()}, ` +
          `risk level ${briefing.riskLevel.toLowerCase()}.`
      ),
    });
  }
);

server.listen().then(() => console.log("Maps Explorer running"));
