import LeadFlow from "./leadflow";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <LeadFlow
      live={process.env.LEADFLOW_MODE === "live"}
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
    />
  );
}
