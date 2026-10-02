'use client';
import {useSyncExternalStore} from 'react';

const subscribe=()=>()=>{};
const clientSnapshot=()=>true;
const serverSnapshot=()=>false;
// Render the same loading state on the server and during initial hydration.
export function useClientReady(){return useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot)}
