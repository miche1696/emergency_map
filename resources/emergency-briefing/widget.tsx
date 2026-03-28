import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React from "react";
import "../styles.css";
import {
  propSchema,
  type EmergencyBriefingProps,
  type EmergencyNewsSeverity,
  type EmergencyRiskLevel,
  type Household,
  type PackPriority,
} from "./types";

export const widgetMetadata: WidgetMetadata = {
  description:
    "Text-first emergency move-prep widget with family-aware packing advice, departure guidance, and area conditions",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    invoking: "Preparing briefing...",
    invoked: "Briefing ready",
  },
};

const riskLevelStyles: Record<EmergencyRiskLevel, string> = {
  Extreme: "bg-red-600 text-white border-red-700",
  High: "bg-orange-500 text-white border-orange-600",
  Elevated: "bg-amber-400 text-slate-900 border-amber-500",
  Guarded: "bg-stone-200 text-slate-900 border-stone-300",
};

const severityStyles: Record<EmergencyNewsSeverity, string> = {
  critical: "border-red-300 bg-red-50 text-red-900",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  info: "border-sky-300 bg-sky-50 text-sky-950",
};

const packPriorityStyles: Record<PackPriority, string> = {
  must: "bg-red-100 text-red-900 border-red-200",
  should: "bg-amber-100 text-amber-950 border-amber-200",
  nice: "bg-stone-100 text-stone-900 border-stone-200",
};

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

function describeTravelParty(household?: Household): string | null {
  if (!household) {
    return null;
  }

  const parts: string[] = [];

  if (household.adults.length) {
    parts.push(`Adults: ${household.adults.join(", ")}`);
  }

  if (household.children.length) {
    parts.push(`Children: ${household.children.join(", ")}`);
  }

  if (!parts.length) {
    return null;
  }

  return parts.join(" • ");
}

function SectionCard({ title, eyebrow, children }: SectionCardProps) {
  return (
    <section className="rounded-[22px] border border-stone-200/80 bg-white/82 p-4 shadow-[0_16px_40px_rgba(30,41,59,0.08)] backdrop-blur-sm dark:border-stone-700/60 dark:bg-slate-900/88">
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className="text-lg text-slate-950 dark:text-stone-50"
        style={{
          fontFamily:
            '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
        }}
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LoadingState() {
  return (
    <McpUseProvider autoSize>
      <div className="p-5">
        <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-slate-900">
          <div className="h-3 w-28 rounded-full bg-stone-200 dark:bg-slate-700" />
          <div className="mt-3 h-8 w-3/4 rounded-full bg-stone-200 dark:bg-slate-700" />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="h-44 rounded-[20px] bg-stone-200 dark:bg-slate-800" />
            <div className="h-44 rounded-[20px] bg-stone-200 dark:bg-slate-800" />
            <div className="h-44 rounded-[20px] bg-stone-200 dark:bg-slate-800" />
            <div className="h-44 rounded-[20px] bg-stone-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </McpUseProvider>
  );
}

const EmergencyBriefing: React.FC = () => {
  const { props, isPending, theme } = useWidget<EmergencyBriefingProps>();
  const isDark = theme === "dark";

  if (isPending) {
    return <LoadingState />;
  }

  const travelPartyLabel = describeTravelParty(props.household);

  const surfaceStyle = isDark
    ? {
        background:
          "radial-gradient(circle at top left, rgba(251,146,60,0.18), transparent 28%), linear-gradient(180deg, #111827 0%, #0f172a 100%)",
      }
    : {
        background:
          "radial-gradient(circle at top left, rgba(245,158,11,0.18), transparent 28%), linear-gradient(180deg, #f9f6ef 0%, #f2efe8 100%)",
      };

  return (
    <McpUseProvider autoSize>
      <div className="p-4 md:p-5">
        <div
          className="overflow-hidden rounded-[30px] border border-stone-200/80 shadow-[0_28px_70px_rgba(15,23,42,0.18)] dark:border-stone-700/70"
          style={surfaceStyle}
        >
          <div className="border-b border-stone-200/80 px-5 py-5 dark:border-stone-700/70 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-stone-500 dark:text-stone-400">
                  Family move-prep briefing
                </p>
                <h1
                  className="mt-2 text-3xl leading-tight text-slate-950 dark:text-stone-50"
                  style={{
                    fontFamily:
                      '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
                  }}
                >
                  {props.areaName}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-stone-300">
                  {props.summary}
                </p>
                {props.destinationLabel ? (
                  <p className="mt-3 text-sm font-medium text-slate-900 dark:text-stone-100">
                    Planned destination: {props.destinationLabel}
                  </p>
                ) : null}
                {travelPartyLabel ? (
                  <p className="mt-2 text-sm text-slate-700 dark:text-stone-300">
                    {travelPartyLabel}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 space-y-2">
                <div
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${riskLevelStyles[props.riskLevel]}`}
                >
                  {props.riskLevel} risk
                </div>
                <p className="text-right text-xs text-stone-500 dark:text-stone-400">
                  {props.generatedAtLabel}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-stone-300/80 bg-white/75 px-3 py-1 text-xs text-slate-700 dark:border-stone-600 dark:bg-slate-900/70 dark:text-stone-200">
                Position {props.position.lat.toFixed(4)}, {props.position.lng.toFixed(4)}
              </div>
              <div className="rounded-full border border-stone-300/80 bg-white/75 px-3 py-1 text-xs text-slate-700 dark:border-stone-600 dark:bg-slate-900/70 dark:text-stone-200">
                {props.weather.condition} • {props.weather.temperatureC}C
              </div>
              <div className="rounded-full border border-stone-300/80 bg-white/75 px-3 py-1 text-xs text-slate-700 dark:border-stone-600 dark:bg-slate-900/70 dark:text-stone-200">
                {props.planningNote}
              </div>
            </div>
          </div>

          <div className="border-b border-stone-200/80 bg-stone-950 px-5 py-3 dark:border-stone-700/70 md:px-6">
            <p className="text-sm font-medium text-stone-100">{props.alertBanner}</p>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-[1.25fr_0.95fr] md:p-5">
            <div className="space-y-4">
              <SectionCard title="Area Conditions" eyebrow="Latest reports">
                <div className="space-y-3">
                  {props.latestNews.map((item) => (
                    <article
                      key={`${item.title}-${item.ageLabel}`}
                      className={`rounded-[18px] border p-3 ${severityStyles[item.severity]} dark:border-opacity-20 dark:bg-slate-950/40 dark:text-stone-100`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold">{item.title}</h3>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] opacity-75">
                          {item.ageLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 opacity-90">{item.detail}</p>
                    </article>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Before You Leave" eyebrow="Departure checklist">
                <ul className="space-y-2">
                  {props.departureChecklist.map((item) => (
                    <li
                      key={item}
                      className="rounded-[18px] border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-slate-800 dark:border-stone-700 dark:bg-slate-950/50 dark:text-stone-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title="Movement" eyebrow="How to move">
                <ul className="space-y-2">
                  {props.movementAdvice.map((item) => (
                    <li
                      key={item}
                      className="rounded-[18px] border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-slate-800 dark:border-stone-700 dark:bg-slate-950/50 dark:text-stone-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title="Practical Notes" eyebrow="Keep it simple">
                <ul className="space-y-2">
                  {props.survivalNotes.map((item) => (
                    <li
                      key={item}
                      className="rounded-[18px] border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-slate-800 dark:border-stone-700 dark:bg-slate-950/50 dark:text-stone-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {props.familyConsiderations.length ? (
                <SectionCard title="Family Notes" eyebrow="For this household">
                  <ul className="space-y-2">
                    {props.familyConsiderations.map((item) => (
                      <li
                        key={item}
                        className="rounded-[18px] border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-slate-800 dark:border-stone-700 dark:bg-slate-950/50 dark:text-stone-200"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              ) : null}
            </div>

            <div className="space-y-4">
              <SectionCard title="Weather Conditions" eyebrow="Mock weather">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-slate-950/50">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                      Temperature
                    </p>
                    <p className="mt-2 text-2xl text-slate-950 dark:text-stone-50">
                      {props.weather.temperatureC}C
                    </p>
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">
                      Feels like {props.weather.feelsLikeC}C
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-slate-950/50">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                      Wind and rain
                    </p>
                    <p className="mt-2 text-2xl text-slate-950 dark:text-stone-50">
                      {props.weather.windKph} kph
                    </p>
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">
                      {props.weather.precipitationChance}% precipitation chance
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-slate-950/50">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                    Visibility
                  </p>
                  <p className="mt-2 text-sm text-slate-800 dark:text-stone-200">
                    {props.weather.visibility}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-stone-300">
                    {props.weather.impactNote}
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="What To Pack" eyebrow="Bag priorities">
                <div className="space-y-3">
                  {props.whatToPack.map((item) => (
                    <article
                      key={item.name}
                      className="rounded-[18px] border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-slate-950/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-stone-50">
                          {item.name}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${packPriorityStyles[item.priority]}`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-stone-300">
                        {item.reason}
                      </p>
                    </article>
                  ))}
                </div>
              </SectionCard>

              {props.packAssignments.length ? (
                <SectionCard title="Carry Roles" eyebrow="Who carries what">
                  <div className="space-y-2">
                    {props.packAssignments.map((item) => (
                      <div
                        key={item}
                        className="rounded-[18px] border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-slate-800 dark:border-stone-700 dark:bg-slate-950/50 dark:text-stone-200"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ) : null}

              <SectionCard title="Comms And Nearby Options" eyebrow="Support points">
                <div className="space-y-4">
                  <div className="space-y-2">
                    {props.communicationPlan.map((item) => (
                      <div
                        key={item}
                        className="rounded-[18px] border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-slate-800 dark:border-stone-700 dark:bg-slate-950/50 dark:text-stone-200"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {props.nearbyPoints.map((point) => (
                      <article
                        key={`${point.name}-${point.kind}`}
                        className="rounded-[18px] border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-slate-950/70"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-stone-50">
                              {point.name}
                            </p>
                            <p className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                              {point.kind}
                            </p>
                          </div>
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {point.distanceKm.toFixed(1)} km
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-stone-300">
                          {point.detail}
                        </p>
                        <p className="mt-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                          Status: {point.status}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    </McpUseProvider>
  );
};

export default EmergencyBriefing;
