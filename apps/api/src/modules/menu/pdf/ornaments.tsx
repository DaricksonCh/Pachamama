import { Polygon, Rect, Svg } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { colors } from './pdf-theme';

const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let x = from; x < to; x += step) out.push(x);
  return out;
};

/**
 * Franja de tejido andino (como el mantel de las fotos): barras, zigzag de triángulos
 * y una fila de rombos. `width` en puntos; la altura es fija (30 pt).
 */
export function WovenBand({ width }: { width: number }) {
  const h = 30;
  const tri = 12;
  const shapes: ReactElement[] = [];
  // Zigzag: triángulos hacia arriba (verde) y hacia abajo (mostaza) encajados.
  for (const x of range(0, width, tri)) {
    shapes.push(
      <Polygon
        key={`u${x}`}
        points={`${x},17 ${x + tri / 2},8 ${x + tri},17`}
        fill={colors.green}
      />,
      <Polygon
        key={`d${x}`}
        points={`${x + tri / 2},8 ${x + tri},17 ${x + tri * 1.5},8`}
        fill={colors.mustard}
      />,
    );
  }
  // Rombos pequeños alternando terracota y verde.
  for (const [i, x] of range(3, width, 9).entries()) {
    shapes.push(
      <Polygon
        key={`r${x}`}
        points={`${x},23 ${x + 2.5},20.5 ${x + 5},23 ${x + 2.5},25.5`}
        fill={i % 2 === 0 ? colors.terracotta : colors.green}
      />,
    );
  }
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Rect x={0} y={0} width={width} height={4} fill={colors.green} />
      <Rect x={0} y={5.5} width={width} height={1.2} fill={colors.terracotta} />
      {shapes}
      <Rect x={0} y={18.2} width={width} height={1.2} fill={colors.terracotta} />
      <Rect x={0} y={27} width={width} height={3} fill={colors.green} />
    </Svg>
  );
}

/** Franja fina para la cabecera de las páginas de platos (12 pt). */
export function ThinBand({ width }: { width: number }) {
  const step = 8;
  return (
    <Svg width={width} height={12} viewBox={`0 0 ${width} 12`}>
      <Rect x={0} y={0} width={width} height={3} fill={colors.green} />
      {range(0, width, step).map((x) => (
        <Polygon key={x} points={`${x},4 ${x + step / 2},10 ${x + step},4`} fill={colors.mustard} />
      ))}
      <Rect x={0} y={10.5} width={width} height={1.5} fill={colors.green} />
    </Svg>
  );
}

/** Chakana (cruz andina escalonada) como viñeta. */
export function Chakana({ size = 12, color = colors.mustard }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 9 9">
      <Polygon
        points="3,0 6,0 6,2 7,2 7,3 9,3 9,6 7,6 7,7 6,7 6,9 3,9 3,7 2,7 2,6 0,6 0,3 2,3 2,2 3,2"
        fill={color}
      />
      <Rect x={3.75} y={3.75} width={1.5} height={1.5} fill={colors.cream} />
    </Svg>
  );
}

/** Separador: línea – chakana – línea. */
export function Divider({ width, color = colors.line }: { width: number; color?: string }) {
  const mid = width / 2;
  return (
    <Svg width={width} height={10} viewBox={`0 0 ${width} 10`}>
      <Rect x={0} y={4.6} width={mid - 12} height={0.8} fill={color} />
      <Polygon points={`${mid},0 ${mid + 5},5 ${mid},10 ${mid - 5},5`} fill={colors.mustard} />
      <Rect x={mid + 12} y={4.6} width={mid - 12} height={0.8} fill={color} />
    </Svg>
  );
}
