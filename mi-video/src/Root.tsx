import { Composition, Folder, Still } from "remotion";
import { duracionTotal } from "./lalinea/tiempos";
import { FPS } from "./marca/guion";
import { Miniatura } from "./lalinea/Miniatura";
import { OrigenNombreLaLinea } from "./lalinea/OrigenNombreLaLinea";
import { ConexionesViariasLaLinea } from "./conexiones/ConexionesViariasLaLinea";
import { MiniaturaConexiones } from "./conexiones/Miniatura";
import { AntiguoHospitalLaLinea } from "./hospital/AntiguoHospitalLaLinea";
import { MiniaturaHospital } from "./hospital/Miniatura";
import { NuevaPaginaFacebook } from "./facebook/NuevaPaginaFacebook";
import { CostaLaLinea } from "./costa/CostaLaLinea";
import { duracionTotal as duracionCosta } from "./costa/tiempos";
import { duracionTotal as duracionFacebook } from "./facebook/tiempos";
import { duracionTotal as duracionHospital } from "./hospital/tiempos";
import { duracionTotal as duracionConexiones } from "./conexiones/tiempos";
import { BarChartScene } from "./BarChartScene";
import { CounterScene } from "./CounterScene";
import { DataVideo } from "./DataVideo";
import { TitleScene } from "./TitleScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Costa">
        <Composition
          id="RellenosYPuertosLaLinea"
          component={CostaLaLinea}
          durationInFrames={duracionCosta()}
          fps={FPS}
          width={1080}
          height={1920}
        />
      </Folder>
      <Folder name="Marca">
        <Composition
          id="NuevaPaginaFacebook"
          component={NuevaPaginaFacebook}
          durationInFrames={duracionFacebook()}
          fps={FPS}
          width={1080}
          height={1920}
        />
      </Folder>
      <Folder name="Ciudad">
        <Composition
          id="AntiguoHospitalLaLinea"
          component={AntiguoHospitalLaLinea}
          durationInFrames={duracionHospital()}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Still id="Miniatura" component={MiniaturaHospital} width={1080} height={1920} />
      </Folder>
      <Folder name="Urbanismo">
        <Composition
          id="ConexionesViariasLaLinea"
          component={ConexionesViariasLaLinea}
          durationInFrames={duracionConexiones()}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Still id="MiniaturaConexionesViariasLaLinea" component={MiniaturaConexiones} width={1080} height={1920} />
      </Folder>
      <Folder name="La-Linea">
        <Composition
          id="OrigenNombreLaLinea"
          component={OrigenNombreLaLinea}
          durationInFrames={duracionTotal()}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Still
          id="MiniaturaOrigenNombreLaLinea"
          component={Miniatura}
          width={1280}
          height={720}
        />
      </Folder>
      <Folder name="Escenas">
        <Composition
          id="Intro"
          component={TitleScene}
          durationInFrames={75}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Resultados 2026",
            subtitle: "Un año en números",
            accentColor: "#4ADE80",
          }}
        />
        <Composition
          id="Contador"
          component={CounterScene}
          durationInFrames={90}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            value: 12480,
            label: "clientes nuevos",
            change: "+38% vs 2025",
            accentColor: "#4ADE80",
          }}
        />
        <Composition
          id="Grafica"
          component={BarChartScene}
          durationInFrames={135}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Ventas por trimestre",
            unit: "k",
            q1: 120,
            q2: 165,
            q3: 210,
            q4: 290,
            barColor: "#6366F1",
            highlightColor: "#4ADE80",
          }}
        />
      </Folder>
      <Composition
        id="VideoDatos"
        component={DataVideo}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
