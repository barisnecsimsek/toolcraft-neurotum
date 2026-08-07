"use client";

import * as React from "react";

import type { AnyToolcraftRendererPipelineRegistration } from "../../rendering";
import type {
  ResolvedToolcraftAppSchema,
  ToolcraftPersistableStateSlice,
} from "../../schema/types";
import { createToolcraftState } from "../../state/create-template-state";
import {
  createToolcraftPersistenceSnapshot,
  getToolcraftPersistenceKey,
  mergeToolcraftInitialState,
  parseToolcraftPersistenceSnapshot,
} from "../../state/persistence";
import { createToolcraftExternalStore } from "../../state/toolcraft-external-store";
import type {
  ToolcraftCommand,
  ToolcraftInitialState,
  ToolcraftState,
} from "../../state/types";
import { readToolcraftLocalStorageValue } from "./storage-key-migration";
import { ToolcraftThemeProvider } from "./theme-runtime";
import { ToolcraftPipelineProvider } from "./toolcraft-pipeline-context";
import { ToolcraftStoreContext } from "./toolcraft-store-context";

export type ToolcraftContextValue = {
  dispatch: React.Dispatch<ToolcraftCommand>;
  state: ToolcraftState;
};

export const ToolcraftContext = React.createContext<ToolcraftContextValue | null>(null);

export type ToolcraftRootProps = {
  children: React.ReactNode;
  initialState?: ToolcraftInitialState;
  rendererPipelineRegistration?: AnyToolcraftRendererPipelineRegistration;
  schema: ResolvedToolcraftAppSchema;
};

function readPersistedInitialState(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftInitialState | undefined {
  const storageKey = getToolcraftPersistenceKey(schema.persistence);

  if (!storageKey || typeof window === "undefined") {
    return undefined;
  }

  try {
    return parseToolcraftPersistenceSnapshot(
      schema,
      readToolcraftLocalStorageValue(storageKey),
    );
  } catch {
    return undefined;
  }
}

function writePersistedState(
  schema: ResolvedToolcraftAppSchema,
  state: ToolcraftState,
): void {
  const storageKey = getToolcraftPersistenceKey(schema.persistence);

  if (!storageKey || typeof window === "undefined") {
    return;
  }

  const snapshot = createToolcraftPersistenceSnapshot(state, schema.persistence);

  if (!snapshot) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort; runtime state stays authoritative when storage is unavailable.
  }
}

function getPersistedStateReferences(
  state: ToolcraftState,
  include: readonly ToolcraftPersistableStateSlice[],
): readonly unknown[] {
  const references: unknown[] = [];

  for (const slice of include) {
    switch (slice) {
      case "canvas":
        references.push(state.canvas);
        break;
      case "layers":
        references.push(state.layers, state.selectedLayerId);
        break;
      case "media":
        references.push(state.mediaAssets);
        break;
      case "panels":
        references.push(state.panels);
        break;
      case "timeline":
        references.push(state.timeline);
        break;
      case "values": {
        for (const target of Object.keys(state.defaults)) {
          references.push(state.values[target]);
        }
        break;
      }
    }
  }

  return references;
}

function persistedStateReferencesEqual(
  previous: readonly unknown[],
  next: readonly unknown[],
): boolean {
  return (
    previous.length === next.length &&
    previous.every((value, index) => Object.is(value, next[index]))
  );
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") {
    return false;
  }

  const candidate = target as {
    closest?: (selector: string) => Element | null;
    isContentEditable?: boolean;
    tagName?: string;
  };

  if (candidate.isContentEditable) {
    return true;
  }

  if (typeof candidate.closest === "function" && candidate.closest("[contenteditable='true']")) {
    return true;
  }

  const tagName = candidate.tagName?.toLowerCase();

  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function isUndoShortcut(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "z"
  );
}

function isRedoShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();

  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    ((event.shiftKey && key === "z") || (!event.metaKey && event.ctrlKey && key === "y"))
  );
}

export function ToolcraftRoot({
  children,
  initialState,
  rendererPipelineRegistration,
  schema,
}: ToolcraftRootProps) {
  const [store] = React.useState(() =>
    createToolcraftExternalStore(
      createToolcraftState(
        schema,
        mergeToolcraftInitialState(readPersistedInitialState(schema), initialState),
      ),
    ),
  );
  const state = React.useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  const dispatch: React.Dispatch<ToolcraftCommand> = store.dispatch;
  const persistenceTimerRef = React.useRef<number | undefined>(undefined);
  const value = React.useMemo(() => ({ dispatch, state }), [dispatch, state]);

  React.useEffect(() => {
    if (!schema.toolbar.history || typeof document === "undefined") {
      return undefined;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (isUndoShortcut(event)) {
        event.preventDefault();
        dispatch({ type: "history.undo" });
        return;
      }

      if (isRedoShortcut(event)) {
        event.preventDefault();
        dispatch({ type: "history.redo" });
      }
    };

    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [dispatch, schema.toolbar.history]);

  React.useEffect(() => {
    const persistence = schema.persistence;

    if (persistence.storage !== "localStorage") {
      return undefined;
    }

    const schedulePersistedState = (): void => {
      if (persistenceTimerRef.current !== undefined) {
        window.clearTimeout(persistenceTimerRef.current);
      }

      persistenceTimerRef.current = window.setTimeout(() => {
        persistenceTimerRef.current = undefined;
        writePersistedState(schema, store.getCommittedState());
      }, 120);
    };
    const unsubscribe = store.subscribeSelector(
      () =>
        getPersistedStateReferences(
          store.getCommittedState(),
          persistence.include,
        ),
      schedulePersistedState,
      persistedStateReferencesEqual,
    );

    schedulePersistedState();

    return () => {
      unsubscribe();

      if (persistenceTimerRef.current !== undefined) {
        window.clearTimeout(persistenceTimerRef.current);
        persistenceTimerRef.current = undefined;
      }
    };
  }, [schema, store]);

  React.useEffect(() => {
    if (schema.persistence.storage !== "localStorage") {
      return undefined;
    }

    const handlePageHide = () => {
      if (persistenceTimerRef.current !== undefined) {
        window.clearTimeout(persistenceTimerRef.current);
        persistenceTimerRef.current = undefined;
      }

      writePersistedState(schema, store.getState());
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [schema, store]);

  const content = (
    <ToolcraftThemeProvider>
      <ToolcraftStoreContext.Provider value={store}>
        <ToolcraftContext.Provider value={value}>{children}</ToolcraftContext.Provider>
      </ToolcraftStoreContext.Provider>
    </ToolcraftThemeProvider>
  );

  return rendererPipelineRegistration ? (
    <ToolcraftPipelineProvider registration={rendererPipelineRegistration}>
      {content}
    </ToolcraftPipelineProvider>
  ) : (
    content
  );
}
