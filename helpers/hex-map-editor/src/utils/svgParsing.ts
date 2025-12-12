export interface SvgPathDefinition {
  id: string;
  label: string;
  fill: string;
  stroke: string | null;
  strokeWidth: number | null;
  d: string;
}

export interface ParsedSvgDocument {
  width: number;
  height: number;
  viewBox: { x: number; y: number; width: number; height: number };
  paths: SvgPathDefinition[];
}

const fallbackViewBox = { x: 0, y: 0, width: 100, height: 100 };

const coerceNumber = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const numeric = Number.parseFloat(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const normaliseColor = (value: string | null): string => {
  if (!value || value.toLowerCase() === "none") {
    return "transparent";
  }
  return value.trim();
};

export const parseSvgString = (raw: string): ParsedSvgDocument => {
  const parser = new DOMParser();
  const documentResult = parser.parseFromString(raw, "image/svg+xml");
  const svgElement = documentResult.documentElement;
  if (!svgElement || svgElement.nodeName.toLowerCase() !== "svg") {
    throw new Error("Provided file is not a valid SVG document");
  }

  const viewBoxRaw = svgElement.getAttribute("viewBox") ?? svgElement.getAttribute("viewbox");
  const viewBoxParts = viewBoxRaw
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const viewBox =
    viewBoxParts && viewBoxParts.length === 4 && viewBoxParts.every((part) => !Number.isNaN(part))
      ? {
          x: viewBoxParts[0],
          y: viewBoxParts[1],
          width: viewBoxParts[2],
          height: viewBoxParts[3],
        }
      : fallbackViewBox;

  const width = coerceNumber(svgElement.getAttribute("width")) ?? viewBox.width;
  const height = coerceNumber(svgElement.getAttribute("height")) ?? viewBox.height;

  const pathElements = Array.from(svgElement.querySelectorAll("path"));
  const paths: SvgPathDefinition[] = pathElements
    .map((pathElement, index) => {
      const d = pathElement.getAttribute("d")?.trim();
      if (!d) {
        return null;
      }

      const fill = normaliseColor(pathElement.getAttribute("fill"));
      const strokeRaw = pathElement.getAttribute("stroke");
      const strokeWidthRaw = coerceNumber(pathElement.getAttribute("stroke-width"));
      const id = pathElement.getAttribute("id") ?? `path-${index}`;
      const label =
        pathElement.getAttribute("data-name") ?? pathElement.getAttribute("title") ?? id;

      return {
        id,
        label,
        fill,
        stroke: strokeRaw,
        strokeWidth: strokeWidthRaw,
        d,
      };
    })
    .filter((entry): entry is SvgPathDefinition => entry !== null);

  if (!paths.length) {
    throw new Error("SVG does not contain any <path> elements with geometry data");
  }

  return {
    width,
    height,
    viewBox,
    paths,
  };
};
