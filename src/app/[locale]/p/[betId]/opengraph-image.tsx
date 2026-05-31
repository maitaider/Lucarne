import { ImageResponse } from "next/og";
import { getSharedPrediction } from "@/lib/social/share";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pronostic Lucarne";

export default async function Image({
  params,
}: {
  params: Promise<{ betId: string }>;
}) {
  const { betId } = await params;

  let pred = null;
  try {
    pred = await getSharedPrediction(betId);
  } catch {
    pred = null;
  }

  const sc = parseScore(pred?.payload);
  const home = pred?.home.name_fr ?? "—";
  const away = pred?.away.name_fr ?? "—";
  const finished = pred?.match_status === "finished";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0f0c",
          color: "#f4f6f4",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 42, fontWeight: 700 }}>
            <span style={{ color: "#22d982", marginRight: 16 }}>●</span>
            <span>Lucarne</span>
          </div>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#9aa69a" }}>
            {pred ? "PRONOSTIC" : "COUPE DU MONDE 2026"}
          </div>
        </div>

        {pred ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 34, color: "#cdd5cd", marginBottom: 18 }}>
              {home} — {away}
            </div>
            <div style={{ display: "flex", alignItems: "center", fontSize: 120, fontWeight: 800 }}>
              <span>{sc ? sc.home : "?"}</span>
              <span style={{ color: "#22d982", margin: "0 28px" }}>–</span>
              <span>{sc ? sc.away : "?"}</span>
            </div>
            {finished ? (
              <div style={{ display: "flex", marginTop: 22, fontSize: 30, color: "#9aa69a" }}>
                {`Final ${pred.home.score ?? "–"} : ${pred.away.score ?? "–"}`}
                {pred.result === "won" ? `  ·  +${pred.points} pts` : ""}
              </div>
            ) : (
              <div style={{ display: "flex", marginTop: 22, fontSize: 26, color: "#9aa69a" }} />
            )}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 60, fontWeight: 800, maxWidth: 900 }}>
            Pool de pronos de la Coupe du Monde 2026
          </div>
        )}

        <div style={{ display: "flex", fontSize: 28, color: "#cdd5cd" }}>
          {pred ? `@${pred.username}  ·  ` : ""}Gratuit · scoré en points · entre amis
        </div>
      </div>
    ),
    { ...size },
  );
}

function parseScore(payload: unknown): { home: number; away: number } | null {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.home === "number" && typeof p.away === "number") {
      return { home: p.home, away: p.away };
    }
  }
  return null;
}
