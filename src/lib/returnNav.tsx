import { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** State pushed on the target route so its "Retour" button knows where to go back. */
export interface ReturnPayload {
  returnTo?: string;
  returnLabel?: string;
  returnState?: Record<string, unknown>;
}

export interface ReturnOrigin {
  /** Human label of the source screen, e.g. "Points à traiter". */
  label?: string;
  /** Screen state to restore when coming back (filters, tab, open dialog, scroll…). */
  state?: Record<string, unknown>;
}

type OriginProvider = () => ReturnOrigin;

const ReturnOriginContext = createContext<OriginProvider | null>(null);

/** Lets a screen declare the state that must be restored when the user comes back to it. */
export function ReturnOriginProvider({
  value,
  children,
}: {
  value: OriginProvider;
  children: ReactNode;
}) {
  // The provider function is read lazily at click time, so it always sees fresh state.
  return <ReturnOriginContext.Provider value={value}>{children}</ReturnOriginContext.Provider>;
}

/** Default label for known internal routes, used when a screen declares no explicit label. */
function defaultLabel(pathname: string): string {
  if (pathname.startsWith('/points-a-traiter')) return 'Points à traiter';
  if (pathname.startsWith('/devis/envoyes') || pathname.startsWith('/devis-envoyes')) return 'Devis envoyés';
  if (pathname.startsWith('/devis/creer')) return 'Création de devis';
  if (/^\/devis\/[^/]+$/.test(pathname)) return 'le devis';
  if (pathname.startsWith('/devis')) return 'Demandes de devis';
  if (/^\/clients\/[^/]+$/.test(pathname)) return 'la fiche client';
  if (pathname.startsWith('/clients')) return 'Clients';
  if (/^\/vehicules\/[^/]+$/.test(pathname)) return 'la fiche véhicule';
  if (pathname.startsWith('/vehicules')) return 'Véhicules';
  if (pathname.startsWith('/rendez-vous')) return 'Rendez-vous';
  if (pathname === '/') return 'Planning';
  return 'écran précédent';
}

/**
 * Navigate to an internal route while remembering the current screen (route + restorable state).
 * The current history entry is also patched so the browser's native Back restores the same state.
 */
export function useNavigateWithReturn() {
  const navigate = useNavigate();
  const location = useLocation();
  const provider = useContext(ReturnOriginContext);

  return useCallback(
    (to: string) => {
      const origin = provider ? provider() : {};
      const here = `${location.pathname}${location.search}`;
      const label = origin.label || defaultLabel(location.pathname);
      const restore = origin.state || {};

      // Keep the source entry's state in sync so native Back restores the screen too.
      navigate(here, {
        replace: true,
        state: { ...(location.state as object | null), ...restore },
      });

      navigate(to, {
        state: { returnTo: here, returnLabel: label, returnState: restore } as ReturnPayload,
      });
    },
    [navigate, location, provider],
  );
}

/** True when the current history entry has an internal Powertech predecessor. */
function hasInternalHistory(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' && idx > 0;
}

/**
 * "Retour" behaviour: explicit returnTo first, then internal history, then a coherent fallback.
 */
export function useBackNavigation(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const payload = (location.state || null) as ReturnPayload | null;

  const goBack = useCallback(() => {
    if (payload?.returnTo) {
      navigate(payload.returnTo, { state: payload.returnState ?? null });
      return;
    }
    if (hasInternalHistory()) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }, [navigate, payload, fallback]);

  const label = useMemo(
    () => payload?.returnLabel || defaultLabel(fallback),
    [payload, fallback],
  );

  return { goBack, label };
}

/** Reads the state a screen asked to restore (set by useNavigateWithReturn). */
export function useRestoredState<T extends Record<string, unknown>>(): Partial<T> {
  const location = useLocation();
  return (location.state as Partial<T> | null) || {};
}
