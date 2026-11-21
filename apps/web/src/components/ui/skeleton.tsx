import type { HTMLAttributes } from 'react';

type SkeletonProps = HTMLAttributes<HTMLSpanElement>;

/**
 * Marcador de carga (skeleton loader). Es decorativo: el texto accesible de "cargando"
 * lo pone el componente que lo usa (role="status" / aria-busy).
 * La animación se desactiva si el usuario pide menos movimiento (motion-safe).
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <span
      data-testid="skeleton"
      aria-hidden="true"
      className={`inline-block rounded-md bg-gray-300/70 motion-safe:animate-pulse ${className}`}
      {...props}
    />
  );
}
