import { z } from "zod";

export const markerSchema = z.object({
  lat: z.number().describe("Latitude"),
  lng: z.number().describe("Longitude"),
  title: z.string().describe("Marker title"),
  description: z.string().optional().describe("Marker description"),
  color: z
    .enum(["red", "blue", "green", "orange", "purple"])
    .optional()
    .describe("Marker color"),
});

export const routeGuideSchema = z.object({
  title: z.string().describe("Guide title"),
  summary: z.string().describe("Short route summary"),
  eta: z.string().describe("Simulated travel time"),
  steps: z.array(z.string()).describe("Short route steps"),
  disclaimer: z.string().describe("Guide disclaimer"),
});

export const propSchema = z.object({
  title: z.string().optional().describe("Map title"),
  center: z
    .object({ lat: z.number(), lng: z.number() })
    .describe("Map center"),
  zoom: z.number().default(12).describe("Zoom level 1-18"),
  markers: z.array(markerSchema).describe("Map markers"),
  guide: routeGuideSchema.optional().describe("Guide displayed above the map"),
});

export type MapViewProps = z.infer<typeof propSchema>;
export type Marker = z.infer<typeof markerSchema>;
export type RouteGuide = z.infer<typeof routeGuideSchema>;
