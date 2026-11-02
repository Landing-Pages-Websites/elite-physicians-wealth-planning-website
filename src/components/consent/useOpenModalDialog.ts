"use client";

import { useSyncExternalStore } from "react";
import { ModalOrder } from "@/components/consent/topLayer";

// One record of the order modals opened in, shared by every subscriber.
const order = new ModalOrder<HTMLDialogElement>();

function currentModal(): HTMLDialogElement | null {
  return order.top();
}

function subscribe(onChange: () => void): () => void {
  order.seed(document);
  // Records arrive in the order the attributes changed, which is the order
  // the dialogs opened and closed in.
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.target instanceof HTMLDialogElement) order.record(record.target);
    }
    onChange();
  });
  observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["open"] });
  return () => observer.disconnect();
}

function getServerSnapshot(): null {
  return null;
}

/** The modal dialog actually on top, which the consent bar must render inside, or null. */
export function useOpenModalDialog(): HTMLDialogElement | null {
  return useSyncExternalStore(subscribe, currentModal, getServerSnapshot);
}
