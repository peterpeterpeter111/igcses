'use client';
import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
/** Do not accept user input until React has attached its handlers. */
export function useBrowserReady() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
