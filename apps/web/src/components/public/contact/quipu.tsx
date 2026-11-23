import { weekSchedule, type OpeningHours } from '@pachamama/shared';
import { cn } from '@/lib/utils';
import { knotHours, quipuAxis } from './quipu-geometry';

interface QuipuProps {
  hours: OpeningHours;
  /** Weekday (0 = Sunday) highlighted as today. */
  today: number;
  /** Short weekday names, indexed by weekday (0 = Sunday). */
  dayLabels: string[];
  restLabel: string;
  /** Loading: cords without knots. */
  pending?: boolean;
}

/**
 * Opening hours drawn as a quipu, the knotted cords the Inca used to record numbers: one cord per
 * weekday, one knot per open hour, a rest day hangs loose. Purely visual: the hours are also given
 * as text next to it, so the whole drawing is hidden from assistive technology.
 */
export function Quipu({ hours, today, dayLabels, restLabel, pending = false }: QuipuProps) {
  const axis = quipuAxis(hours);
  const span = axis.end - axis.start;
  const ticks = [
    axis.start,
    Math.round(axis.start + span / 3),
    Math.round(axis.start + (2 * span) / 3),
    axis.end,
  ];

  return (
    <div aria-hidden="true" className="relative pr-12" data-testid="quipu">
      <div className="h-3.5 rounded-full bg-[repeating-linear-gradient(135deg,#c79a32_0_6px,var(--color-maiz)_6px_12px)] shadow-[0_3px_0_rgba(0,0,0,0.25)]" />
      <div className="relative grid h-72 grid-cols-7 sm:h-96">
        <div className="absolute top-0 right-0 bottom-8 flex translate-x-full flex-col justify-between pl-2 text-xs text-papel/70 tabular-nums">
          {ticks.map((h) => (
            <span key={h}>{`${h}:00`}</span>
          ))}
        </div>
        {weekSchedule(hours).map((day) => {
          const isToday = day.weekday === today;
          const rest = !pending && day.ranges.length === 0;
          const knots = pending ? [] : knotHours(day, axis);
          return (
            <div
              key={day.weekday}
              className="relative flex justify-center"
              data-weekday={day.weekday}
              data-knots={knots.length}
            >
              <span
                className={cn(
                  'absolute top-0 w-1 origin-top rounded-full',
                  isToday
                    ? 'bg-[repeating-linear-gradient(170deg,var(--color-maiz)_0_3px,#c79a32_3px_6px)]'
                    : 'bg-[repeating-linear-gradient(170deg,#e8dfc8_0_3px,#cbbf9f_3px_6px)]',
                  rest ? 'bottom-[45%] rotate-[5deg] opacity-60' : 'bottom-8',
                )}
              />
              {knots.map((h, i) => (
                <span
                  key={h}
                  className={cn(
                    'quipu-knot absolute left-1/2 size-3.5 -translate-x-1/2 rounded-full shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.2)] sm:size-4',
                    isToday ? 'bg-aji' : 'bg-maiz',
                  )}
                  style={{
                    top: `calc((100% - 2rem) * ${(h - axis.start + 0.5) / span} - 0.5rem)`,
                    ['--knot-delay' as string]: `${i * 45}ms`,
                  }}
                />
              ))}
              {rest && (
                <span className="absolute top-[60%] -rotate-6 font-script text-xl whitespace-nowrap text-papel/80">
                  {restLabel}
                </span>
              )}
              <span
                className={cn(
                  'absolute bottom-0 font-display text-sm sm:text-base',
                  isToday && 'font-bold text-maiz',
                )}
              >
                {dayLabels[day.weekday]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
