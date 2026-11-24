import { Polygon, Rect, Svg } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { colors } from './pdf-theme';

const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let x = from; x < to; x += step) out.push(x);
  return out;
};

type BandColors = { edge: string; up: string; down: string };

/**
 * Franja de tejido andino: bordes lisos y un zigzag de triángulos encajados.
 * `width` en puntos; la altura es fija (26 pt). Colores por defecto: los de la portada.
 */
export function WovenBand({
  width,
  palette = { edge: colors.maiz, up: colors.aji, down: colors.paper },
}: {
  width: number;
  palette?: BandColors;
}) {
  const h = 26;
  const tri = 10.4;
  const shapes: ReactElement[] = [];
  for (const x of range(0, width, tri)) {
    shapes.push(
      <Polygon key={`u${x}`} points={`${x},16 ${x + tri / 2},8 ${x + tri},16`} fill={palette.up} />,
      <Polygon
        key={`d${x}`}
        points={`${x + tri / 2},8 ${x + tri},16 ${x + tri * 1.5},8`}
        fill={palette.down}
      />,
    );
  }
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Rect x={0} y={0} width={width} height={3.6} fill={palette.edge} />
      {shapes}
      <Rect x={0} y={22.4} width={width} height={3.6} fill={palette.edge} />
    </Svg>
  );
}

/** Hilera de rombos (separador de la etiqueta de portada). */
export function RhombRow({
  width,
  color = colors.chicha,
  size = 5,
  gap = 10,
}: {
  width: number;
  color?: string;
  size?: number;
  gap?: number;
}) {
  const half = size / 2;
  return (
    <Svg width={width} height={size} viewBox={`0 0 ${width} ${size}`}>
      {range(0, width - size + 0.01, gap).map((x) => (
        <Polygon
          key={x}
          points={`${x},${half} ${x + half},0 ${x + size},${half} ${x + half},${size}`}
          fill={color}
        />
      ))}
    </Svg>
  );
}

/** Rombo tejido en el hueco de un plato sin foto: el marco se mantiene, nada se descoloca. */
export function PhotoPlaceholder({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: string;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 5;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} fill={colors.page} />
      <Polygon
        points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
        fill={color}
      />
      <Polygon
        points={`${cx},${cy - r / 2.4} ${cx + r / 2.4},${cy} ${cx},${cy + r / 2.4} ${cx - r / 2.4},${cy}`}
        fill={colors.page}
      />
    </Svg>
  );
}

/** Chakana (cruz andina escalonada) como viñeta. */
export function Chakana({ size = 12, color = colors.maiz }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 9 9">
      <Polygon
        points="3,0 6,0 6,2 7,2 7,3 9,3 9,6 7,6 7,7 6,7 6,9 3,9 3,7 2,7 2,6 0,6 0,3 2,3 2,2 3,2"
        fill={color}
      />
      <Rect x={3.75} y={3.75} width={1.5} height={1.5} fill={colors.page} />
    </Svg>
  );
}
