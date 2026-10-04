import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { DATOS, MOMENTOS } from "../config";
import { Candado, IconoAyuntamiento, IconoJunta, IconoSeguridadSocial } from "../graficos";
import { frameEnEscena } from "../tiempos";

const CENTRO = { x: 540, y: 900 };

const Institucion: React.FC<{ readonly x: number; readonly y: number; readonly nombre: string; readonly icono: React.ReactNode; readonly desde: number }> = ({
  x,
  y,
  nombre,
  icono,
  desde,
}) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 12, 13);
  return (
    <div style={{ position: "absolute", left: x - 140, top: y - 90, width: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: p, scale: interpolate(p, [0, 1], [0.6, 1]) }}>
      <div style={{ width: 150, height: 150, borderRadius: 75, border: `5px solid ${COLOR.blanco}`, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}>{icono}</div>
      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 38, lineHeight: 1.05, color: COLOR.blanco, textAlign: "center" }}>{nombre}</div>
    </div>
  );
};

export const Situacion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const ss = f("seguridadSocial");
  const ay = f("ayuntamiento");
  const ju = f("junta");
  const desb = f("desbloquear");
  // El candado intenta abrirse, sin llegar a hacerlo
  const intento = interpolate(frame, [desb, desb + 0.4 * fps, desb + 0.8 * fps, desb + 1.4 * fps, desb + 2 * fps], [0, 0.45, 0.25, 0.4, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const vibra = frame > desb && frame < desb + 0.8 * fps ? Math.sin(frame * 2.2) * 4 : 0;
  const nodos = [
    { x: 250, y: 620, desde: ay, nombre: "Ayuntamiento", icono: <IconoAyuntamiento size={100} /> },
    { x: 830, y: 620, desde: ju, nombre: "Junta", icono: <IconoJunta size={100} /> },
    { x: 540, y: 1220, desde: ss, nombre: "Seguridad Social", icono: <IconoSeguridadSocial size={100} /> },
  ];

  return (
    <Escena fondo="azul">
      <Titular principal="¿En qué punto" destacado="está?" desde={0} tamano={84} />
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        {nodos.map((n) => {
          const p = suave(frame, n.desde + 6, 12);
          return (
            <line
              key={n.nombre}
              x1={CENTRO.x}
              y1={CENTRO.y}
              x2={CENTRO.x + (n.x - CENTRO.x) * p}
              y2={CENTRO.y + (n.y - CENTRO.y) * p}
              stroke={COLOR.blanco}
              strokeWidth={6}
              strokeDasharray="14 12"
              opacity={0.8}
            />
          );
        })}
      </svg>
      {nodos.map((n) => (
        <Institucion key={n.nombre} {...n} />
      ))}
      <div style={{ position: "absolute", left: CENTRO.x - 80, top: CENTRO.y - 110, translate: `${vibra}px 0px`, scale: 0.6 + entrada(frame, 6, 14) * 0.4 }}>
        <Candado size={160} apertura={intento} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 430,
          right: 80,
          backgroundColor: COLOR.lima,
          color: COLOR.negro,
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 40,
          padding: "8px 20px",
          borderRadius: 999,
          scale: entrada(frame, f("septiembre"), 12, 13),
        }}
      >
        Septiembre {DATOS.septiembre}
      </div>
    </Escena>
  );
};
