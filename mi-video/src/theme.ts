import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const fontFamily = "Inter";

for (const weight of ["400", "700", "900"]) {
  loadFont({
    family: fontFamily,
    url: staticFile(`fonts/Inter-${weight}.woff2`),
    weight,
  });
}
