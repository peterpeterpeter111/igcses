'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Chapter = {
  id: string;
  title: string;
  section: string;
  terms: string[];
  complete: boolean;
};

export function ChapterPath({
  subjectId,
  chapters,
}: {
  subjectId: string;
  chapters: Chapter[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const container = containerRef.current;
    const route = routeRef.current;
    if (!container || !route) return;
    const measure = () => {
      const card = container.querySelector('.is-selected .chapter-card');
      const svg = route.ownerSVGElement;
      if (!card || !svg) {
        setProgress(0);
        return;
      }
      const bounds = svg.getBoundingClientRect();
      const target = card.getBoundingClientRect();
      if (!bounds.height) return;
      const targetY =
        ((target.top + target.height / 2 - bounds.top) / bounds.height) * 1000;
      const length = route.getTotalLength();
      let low = 0,
        high = length;
      // The curve moves monotonically downwards. Locate the selected card's
      // actual height along it, including wrapped text and expanded panels.
      for (let i = 0; i < 24; i++) {
        const mid = (low + high) / 2;
        if (route.getPointAtLength(mid).y < targetY) low = mid;
        else high = mid;
      }
      setProgress(length ? (low + high) / (2 * length) : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [selectedId]);
  return (
    <div
      ref={containerRef}
      className="chapter-path"
      aria-label="Ascending chapter path"
    >
      <svg
        className="chapter-route"
        viewBox="0 0 120 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          ref={routeRef}
          vectorEffect="non-scaling-stroke"
          d="M42 0 C95 90 16 160 58 250 S18 420 67 510 S17 680 59 770 S25 930 52 1000"
        />
        <path
          className="chapter-route-glow"
          vectorEffect="non-scaling-stroke"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
          d="M42 0 C95 90 16 160 58 250 S18 420 67 510 S17 680 59 770 S25 930 52 1000"
        />
      </svg>
      <span className="path-tree path-tree-one" aria-hidden="true">
        木
      </span>
      <span className="path-tree path-tree-two" aria-hidden="true">
        木
      </span>
      <span className="path-tree path-tree-three" aria-hidden="true">
        木
      </span>
      <span className="path-tree path-tree-four" aria-hidden="true">
        木
      </span>
      {chapters.map((chapter, index) => {
        const selected = selectedId === chapter.id;
        const panelId = 'chapter-detail-' + chapter.id;
        return (
          <div
            className={'chapter-stop' + (selected ? ' is-selected' : '')}
            key={chapter.id}
          >
            <button
              type="button"
              className="chapter-card"
              aria-expanded={selected}
              aria-controls={panelId}
              aria-current={selected ? 'step' : undefined}
              onClick={() => setSelectedId(selected ? null : chapter.id)}
            >
              <span className="house-mark" aria-hidden="true">
                ⌂
              </span>
              <span className="chapter-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="chapter-card-copy">
                <strong>{chapter.title}</strong>
                <small>
                  {chapter.section} ·{' '}
                  {chapter.complete ? 'Complete' : 'In progress'}
                </small>
              </span>
              <span className="chapter-card-mark" aria-hidden="true">
                {selected ? '−' : '+'}
              </span>
            </button>
            {selected && (
              <div className="chapter-book" id={panelId}>
                <span className="chapter-book-petal" aria-hidden="true">
                  ✿
                </span>
                <p>{chapter.terms.join(' · ')}</p>
                <Link
                  className="action primary"
                  href={'/subjects/' + subjectId + '/' + chapter.id}
                >
                  Open chapter like a book ↗
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
