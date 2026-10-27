import type { ComponentProps } from 'react';

// Native navigation avoids the production Vinext client-router/prefetch crash.
// Keep normal browser keyboard, modifier-click, hash and Back behaviour. Book
// exits still run in SubjectBookLink before their bounded native navigation.
export default function NavigationLink({ children, ...props }: ComponentProps<'a'> & { href: string }) {
  return <a {...props}>{children}</a>;
}
