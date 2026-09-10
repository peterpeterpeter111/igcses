'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ChapterOpenLink } from '@/components/subject-book-link';

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
  const clipId = useId();
  const [progress, setProgress] = useState(0);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const target = container.querySelector<HTMLElement>(
        '.is-selected .chapter-stop-anchor',
      );
      const stop = target?.offsetParent as HTMLElement | null;
      if (!target || !stop || !container.clientHeight) {
        setProgress(0);
        return;
      }
      // Layout coordinates avoid entrance transforms. Clip by height rather
      // than arc length: non-scaling SVG dashes drift when the road stretches.
      const y = stop.offsetTop + target.offsetTop + target.offsetHeight / 2;
      setProgress(Math.max(0, Math.min(1, y / container.clientHeight)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container
      .querySelectorAll('.chapter-card')
      .forEach((card) => observer.observe(card));
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
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <rect x="-10" y="0" width="140" height={progress * 1000} />
          </clipPath>
        </defs>
        <path
          vectorEffect="non-scaling-stroke"
          d="M42 0 C95 90 16 160 58 250 S18 420 67 510 S17 680 59 770 S25 930 52 1000"
        />
        <path
          className="chapter-route-glow"
          vectorEffect="non-scaling-stroke"
          clipPath={'url(#' + clipId + ')'}
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
            <span className="chapter-stop-anchor" aria-hidden="true" />
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
                <span
                  className="chapter-book-page chapter-book-page-left"
                  aria-hidden="true"
                />
                <span
                  className="chapter-book-page chapter-book-page-right"
                  aria-hidden="true"
                />
                <span className="chapter-book-spine" aria-hidden="true" />
                <div className="chapter-book-content">
                  <span className="chapter-book-petal" aria-hidden="true">
                    ✿
                  </span>
                  <p>{chapter.terms.join(' · ')}</p>
                  <ChapterOpenLink
                    chapterTitle={chapter.title}
                    href={'/subjects/' + subjectId + '/' + chapter.id}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
