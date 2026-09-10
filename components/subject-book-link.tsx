'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

export function SubjectBookLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const opening = useRef<Animation | null>(null);
  const restore = useRef<() => void>(() => {});
  useEffect(() => {
    const reset = () => restore.current();
    window.addEventListener('pageshow', reset);
    return () => {
      window.removeEventListener('pageshow', reset);
      reset();
    };
  }, []);

  async function open(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const book = event.currentTarget;
    const shelf = book.closest<HTMLElement>('.bookshelf') ?? book;
    if (opening.current || shelf.dataset.opening === 'true') {
      event.preventDefault();
      return;
    }
    if (typeof book.animate !== 'function') return;
    event.preventDefault();
    shelf.dataset.opening = 'true';
    // Native links still handle new tabs and reduced motion. A bounded 3D exit
    // finishes before navigation; cancelling its fill keeps browser Back usable.
    const animation = book.animate(
      [
        {
          transform: 'perspective(900px) translateZ(0) rotateY(0)',
          opacity: 1,
          clipPath: 'inset(0)',
        },
        {
          transform:
            'perspective(900px) translateZ(65px) rotateY(-7deg) rotateX(4deg)',
          opacity: 1,
          clipPath: 'inset(0)',
          offset: 0.38,
        },
        {
          transform:
            'perspective(900px) translateZ(130px) rotateY(-16deg) rotateX(8deg)',
          opacity: 1,
          clipPath: 'inset(0)',
        },
      ],
      {
        duration: 900,
        easing: 'cubic-bezier(.22,.72,.24,1)',
        fill: 'forwards',
      },
    );
    // Clear the shelf smoothly from the bottom upward. The perspective lift
    // keeps the transition book-like without a noisy texture.
    const dissolve = shelf.animate(
      [
        {
          opacity: 1,
          transform:
            'perspective(1100px) translateZ(0) rotateX(0) translateY(0)',
          clipPath: 'inset(0)',
          filter: 'blur(0)',
        },
        {
          opacity: 0.72,
          transform:
            'perspective(1100px) translateZ(72px) rotateX(5deg) rotateY(-3deg) translateY(-10px)',
          clipPath: 'inset(0 0 42% 0)',
          filter: 'blur(.5px)',
          offset: 0.55,
        },
        {
          opacity: 0,
          transform:
            'perspective(1100px) translateZ(150px) rotateX(9deg) rotateY(-6deg) translateY(-22px)',
          clipPath: 'inset(0 0 100% 0)',
          filter: 'blur(2px)',
        },
      ],
      {
        duration: 900,
        easing: 'cubic-bezier(.22,.72,.24,1)',
        fill: 'forwards',
      },
    );
    let recovery: ReturnType<typeof setTimeout> | undefined;
    restore.current = () => {
      animation.cancel();
      dissolve.cancel();
      delete shelf.dataset.opening;
      opening.current = null;
      clearTimeout(recovery);
    };
    opening.current = animation;
    try {
      await Promise.all([animation.finished, dissolve.finished]);
      router.push(href);
      // Restore a usable shelf if navigation cannot complete. Unmount normally
      // clears the masks first; browser Back also clears them via pageshow.
      recovery = setTimeout(() => restore.current(), 1500);
    } catch {
      restore.current();
    }
  }
  return (
    <Link
      className="subject-row"
      href={href}
      onClick={(event) => {
        void open(event);
      }}
    >
      {children}
    </Link>
  );
}

export function ChapterOpenLink({
  href,
  chapterTitle,
}: {
  href: string;
  chapterTitle: string;
}) {
  const router = useRouter();
  const opening = useRef<Animation | null>(null);

  useEffect(() => {
    return () => {
      opening.current?.cancel();
      opening.current = null;
    };
  }, []);

  async function open(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const book = event.currentTarget.closest<HTMLElement>('.chapter-book');
    if (opening.current || !book || typeof book.animate !== 'function') {
      if (opening.current) event.preventDefault();
      return;
    }
    event.preventDefault();
    book.dataset.transitioning = 'true';
    const animation = book.animate(
      [
        {
          opacity: 1,
          transform: 'perspective(900px) translateZ(0) rotateY(0) rotateX(0)',
        },
        {
          opacity: 0.82,
          transform:
            'perspective(900px) translateZ(34px) rotateY(-7deg) rotateX(2deg)',
          offset: 0.45,
        },
        {
          opacity: 0,
          transform:
            'perspective(900px) translateZ(150px) rotateY(-32deg) rotateX(8deg)',
        },
      ],
      {
        duration: 900,
        easing: 'cubic-bezier(.22,.72,.24,1)',
        fill: 'forwards',
      },
    );
    opening.current = animation;
    try {
      await animation.finished;
      router.push(href);
    } catch {
      animation.cancel();
    } finally {
      delete book.dataset.transitioning;
      opening.current = null;
    }
  }

  return (
    <Link
      className="action primary"
      aria-label={'Open ' + chapterTitle + ' chapter'}
      href={href}
      onClick={(event) => {
        void open(event);
      }}
    >
      Open
    </Link>
  );
}
