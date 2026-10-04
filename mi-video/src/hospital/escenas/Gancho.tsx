import { useCurrentFrame } from "remotion";
import { suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { Etiqueta } from "../../marca/Etiqueta";
import { COLOR, ZONA_SEGURA } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { Golpe } from "../comun";
import { MOMENTOS } from "../config";
import { FondoHospital } from "../graficos";
import { FUENTE } from "../../marca/marca";
import { frameEnEscena } from "../tiempos";

export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const g1 = frameEnEscena(MOMENTOS.golpe1);
  const g2 = frameEnEscena(MOMENTOS.golpe2);
  const g3 = frameEnEscena(MOMENTOS.golpe3);

  return (
    <Escena fondo="azul">
      <div style={{ position: "absolute", inset: 0, opacity: 1 - suave(frame, g1, 10) * 0.65 }}>
        <FondoHospital indice={0} />
      </div>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados }}>
        <Etiqueta conIsotipo>CIUDAD</Etiqueta>
      </div>
      <Titular principal="¿Qué pasa con el" destacado="antiguo hospital?" desde={0} top={ZONA_SEGURA.arriba + 120} tamano={92} />
      <div
        style={{
          position: "absolute",
          top: 640,
          left: ZONA_SEGURA.lados,
          right: ZONA_SEGURA.lados,
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        {[
          { etiqueta: "Cerrado desde", dato: "2018", color: COLOR.lima, desde: g1, siguiente: g2 },
          { etiqueta: "Valorado en", dato: "6 millones", color: COLOR.lima, desde: g2, siguiente: g3 },
          { etiqueta: "Rehabilitarlo: otros", dato: "12 millones", color: COLOR.rosa, desde: g3, siguiente: undefined },
        ].map((g) => (
          <Golpe key={g.dato} desde={g.desde} tamano={150} atenuar={g.siguiente === undefined ? 0 : suave(frame, g.siguiente, 8)}>
            <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 48, letterSpacing: 0 }}>{g.etiqueta}</div>
            <div style={{ color: g.color, letterSpacing: -5 }}>{g.dato}</div>
          </Golpe>
        ))}
      </div>
    </Escena>
  );
};
