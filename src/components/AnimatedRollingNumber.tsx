import React, { useEffect, useRef, useState } from 'react';

interface AnimatedRollingNumberProps {
  value: number;
  /** When true (e.g. controversy), an increase is treated as adverse and a decrease as beneficial. */
  invertPolarity?: boolean;
  /** Show compact inline delta badge (+8 / -12) briefly when value changes. */
  showDelta?: boolean;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const AnimatedRollingNumber: React.FC<AnimatedRollingNumberProps> = ({
  value,
  invertPolarity = false,
  showDelta = true,
  className = '',
}) => {
  const prevValueRef = useRef<number>(value);
  const [deltaInfo, setDeltaInfo] = useState<{
    amount: number;
    direction: 'up' | 'down';
    isPositiveSentiment: boolean;
    key: number;
  } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev !== value) {
      const diff = value - prev;
      const direction: 'up' | 'down' = diff > 0 ? 'up' : 'down';
      const isPositiveSentiment = invertPolarity ? diff < 0 : diff > 0;

      setDeltaInfo({
        amount: diff,
        direction,
        isPositiveSentiment,
        key: Date.now() + Math.random(),
      });
      setIsAnimating(true);
      prevValueRef.current = value;

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 900);

      const clearDeltaTimer = setTimeout(() => {
        setDeltaInfo(null);
      }, 2200);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearDeltaTimer);
      };
    }
  }, [value, invertPolarity]);

  const formatted = Math.round(value).toString();
  const chars = formatted.split('');

  const sentimentColor = deltaInfo
    ? deltaInfo.isPositiveSentiment
      ? 'text-emerald-300'
      : 'text-rose-300'
    : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono-tabular align-baseline ${className}`}
    >
      {/* Accessible true numeric readout for screen readers and DOM snapshots */}
      <span className="sr-only">{formatted}</span>

      {/* Visual rolling odometer digits */}
      <span
        aria-hidden="true"
        className={`inline-flex items-center leading-none transition-[color,transform] duration-300 ease-out ${
          isAnimating ? `scale-[1.06] ${sentimentColor}` : 'scale-100'
        }`}
      >
        {chars.map((char, idx) => {
          const digit = Number(char);
          if (Number.isNaN(digit)) {
            return (
              <span key={`sym-${idx}`} className="inline-block">
                {char}
              </span>
            );
          }

          return (
            <span
              key={`col-${chars.length - idx}`}
              className="relative inline-block h-[1.15em] w-[0.65em] overflow-hidden align-top"
            >
              <span
                className="flex flex-col items-center will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  transform: `translate3d(0, -${digit * 10}%, 0)`,
                  transitionDelay: `${idx * 35}ms`,
                }}
              >
                {DIGITS.map((d) => (
                  <span
                    key={d}
                    className="h-[1.15em] leading-[1.15em] flex items-center justify-center select-none"
                  >
                    {d}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>

      {/* Brief directional delta indicator */}
      {showDelta && deltaInfo && (
        <span
          key={deltaInfo.key}
          aria-hidden="true"
          className={`text-[11px] font-semibold leading-none transition-opacity duration-500 animate-[deltaPop_0.35s_cubic-bezier(0.16,1,0.3,1)] ${
            deltaInfo.isPositiveSentiment ? 'text-emerald-300' : 'text-rose-300'
          } ${isAnimating ? 'opacity-100' : 'opacity-65'}`}
        >
          {deltaInfo.amount > 0 ? `+${deltaInfo.amount}` : deltaInfo.amount}
        </span>
      )}
    </span>
  );
};
