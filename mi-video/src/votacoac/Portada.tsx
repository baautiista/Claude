import { AbsoluteFill, Img, staticFile } from "remotion";
import { FUENTES, MODALIDADES, ORDEN, V } from "./config";
import { Guirnalda, MiniLabel, Wordmark } from "./piezas";

/** Portada vertical (titular en la franja central 3:4). */
export const PortadaVotaCoac: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: V.tinta }}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${V.azul}66 0%, transparent 60%)` }} />
    <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
      <Guirnalda alto={20} />
    </div>
    <div style={{ position: "absolute", top: 280, left: 80, right: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Img src={staticFile("votacoac/icono.png")} style={{ width: 96, height: 96, borderRadius: 24 }} />
        <Wordmark tam={70} claro />
      </div>
      <div style={{ fontFamily: FUENTES.display, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.95, color: V.blanco, marginTop: 70 }}>
        <div style={{ fontSize: 150 }}>¿SABES</div>
        <div style={{ fontSize: 150 }}>QUIÉN VA A</div>
        <div style={{ fontSize: 190, color: V.amarillo }}>GANAR</div>
        <div style={{ fontSize: 150 }}>
          EL COAC <span style={{ color: V.azul }}>2027</span>?
        </div>
      </div>
      <div style={{ marginTop: 50 }}>
        <MiniLabel tam={30} color={V.blanco} estrella={V.amarillo}>
          Las cinco del público
        </MiniLabel>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        {ORDEN.map((m) => (
          <div key={m} style={{ flex: 1, backgroundColor: MODALIDADES[m].color, borderRadius: 14, padding: "10px 0", textAlign: "center", fontFamily: FUENTES.display, fontWeight: 800, fontSize: 30, color: m === "Chirigota" || m === "Cuarteto" ? V.tinta : V.blanco }}>
            5 {MODALIDADES[m].plural.toUpperCase()}
          </div>
        ))}
      </div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <Guirnalda alto={20} />
    </div>
  </AbsoluteFill>
);
