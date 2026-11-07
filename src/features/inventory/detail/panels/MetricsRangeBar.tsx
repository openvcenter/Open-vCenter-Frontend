import * as React from "react";
import { Button } from "~/components/win95";
import { clock, relTime, shortDateTime } from "../../format";

/** A zoomed period, as sample timestamps (stable while polling adds samples). */
export type MetricZoom = { from: string; to: string };

/** Lets every MetricChart in a metrics tab zoom the whole tab by dragging, and
 *  reset it by double-clicking. Without a provider the charts don't zoom. */
export const MetricZoomContext = React.createContext<{
  zoom: (from: string, to: string) => void;
  reset: () => void;
} | null>(null);

// range presets shorter than the retention window, then "All" (= retention)
const PRESETS = [3_600, 7_200, 21_600, 43_200, 86_400, 259_200];
const DEFAULT_RANGE = 3_600;

const rangeLabel = (s: number) => (s < 86_400 ? `${s / 3_600}h` : `${s / 86_400}d`);

/** Range + zoom state of a metrics tab. `seconds` is what to fetch: the picked
 *  range, never past the retention window. */
export function useMetricsView(retention: number | undefined) {
  const [range, setRange] = React.useState(DEFAULT_RANGE);
  const [zoom, setZoom] = React.useState<MetricZoom | null>(null);
  const zoomCtx = React.useMemo(
    () => ({ zoom: (from: string, to: string) => setZoom({ from, to }), reset: () => setZoom(null) }),
    [],
  );
  return {
    seconds: retention ? Math.min(range, retention) : range,
    retention,
    zoom,
    zoomCtx,
    pickRange: (s: number) => {
      setRange(s);
      setZoom(null);
    },
  };
}

export type MetricsView = ReturnType<typeof useMetricsView>;

/** The samples inside the zoomed period (all of them when not zoomed). */
export function zoomed<T extends { ts: string }>(samples: T[], zoom: MetricZoom | null): T[] {
  if (!zoom) return samples;
  const from = Date.parse(zoom.from);
  const to = Date.parse(zoom.to);
  return samples.filter((s) => {
    const t = Date.parse(s.ts);
    return t >= from && t <= to;
  });
}

/** Top of a metrics tab: range buttons (when retention is over an hour), then
 *  the sample count and span, or the zoomed period with Reset zoom. Once the
 *  bar scrolls out of view, its buttons float in the tab's top-left corner;
 *  they go away when the bar is back in view. */
export function MetricsRangeBar({
  view,
  samples,
}: {
  view: MetricsView;
  samples: { ts: string }[];
}) {
  const { retention, seconds, zoom } = view;
  const ranges =
    retention && retention > DEFAULT_RANGE
      ? [...PRESETS.filter((p) => p < retention), retention]
      : [];
  const spansDays = !!zoom && Date.parse(zoom.to) - Date.parse(zoom.from) > 86_400_000;
  const at = (iso: string) => (spansDays ? shortDateTime(iso) : clock(iso));

  const barRef = React.useRef<HTMLDivElement>(null);
  const [scrolledAway, setScrolledAway] = React.useState(false);
  React.useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    // clipped by the tab's scroll area counts as out of view
    const io = new IntersectionObserver(([e]) => setScrolledAway(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rangeButtons =
    ranges.length > 0 ? (
      <div className="flex gap-1" role="group" aria-label="Time range">
        {ranges.map((r) => (
          <Button
            key={r}
            className="min-w-0 px-2"
            pressed={r === seconds}
            aria-pressed={r === seconds}
            onClick={() => view.pickRange(r)}
          >
            {r === retention ? "All" : rangeLabel(r)}
          </Button>
        ))}
      </div>
    ) : null;
  const resetButton = (
    <Button className="min-w-0 px-2" onClick={view.zoomCtx.reset}>
      Reset zoom
    </Button>
  );

  return (
    <>
      {/* zero-height sticky anchor for the floating buttons; -mb-3 cancels the
          panel's gap so it takes no room */}
      <div className="sticky top-0 z-20 -mb-3 h-0">
        {scrolledAway && (rangeButtons || zoom) ? (
          <div className="bevel-raised bg-surface absolute top-0 left-0 flex items-center gap-1 p-1">
            {rangeButtons}
            {zoom ? resetButton : null}
          </div>
        ) : null}
      </div>
      <div ref={barRef} className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {rangeButtons}
        {zoom ? (
          <>
            <span className="text-xs">
              Zoomed: {at(zoom.from)} → {at(zoom.to)}
            </span>
            {resetButton}
          </>
        ) : samples.length > 0 ? (
          <span className="text-xs text-disabled-text">
            {samples.length} samples · {relTime(samples[0].ts)} →{" "}
            {relTime(samples[samples.length - 1].ts)}
          </span>
        ) : null}
      </div>
    </>
  );
}
