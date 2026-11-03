"use client";

import { useSyncExternalStore } from "react";
import { ModalOrder, watchModalHost } from "@/components/consent/topLayer";

// One record of the order modals opened in, shared by every subscriber.
const order = new ModalOrder<HTMLDialogElement>();

function currentModal(): HTMLDialogElement | null {
  return order.top();
}

function isDialog(node: unknown): node is HTMLDialogElement {
  return node instanceof HTMLDialogElement;
}

function subscribe(onChange: () => void): () => void {
  return watchModalHost(document, order, isDialog, onChange, MutationObserver);
}

function getServerSnapshot(): null {
  return null;
}

/** The modal dialog actually on top, which the consent bar must render inside, or null. */
export function useOpenModalDialog(): HTMLDialogElement | null {
  return useSyncExternalStore(subscribe, currentModal, getServerSnapshot);
}
