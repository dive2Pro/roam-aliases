import React, { useLayoutEffect, useRef, useState } from "react";
import "arrive";
import fd from "findandreplacedomtext";
const id = ".roam-block";

export function useHighlightWordsInDom(
  target: string,
  callback: (e: HTMLElement) => void
) {
  useLayoutEffect(() => {
    const el = document.querySelector(target);
    el.arrive(id, (target: HTMLElement) => {
      callback(target);
    });
    return () => {
      el.unbindArrive(id);
    };
  }, [target, callback]);

  return {};
}

export function useHighlightUnlinkAliases() {
   
}
