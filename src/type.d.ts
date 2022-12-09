import { PullBlock } from "roamjs-components/types";

export type BlockRefType = {
  uid: string;
  blockUid: string;
  el?: HTMLElement;
};


export type AliasesBlock = PullBlock & {
  aliases?: Set<string>
}

export type RoamExtensionAPI = {
  settings: {
    get: (k: string) => unknown;
    getAll: () => Record<string, unknown>;
    panel: {
      create: (c: PanelConfig) => void;
    };
    set: (k: string, v: unknown) => Promise<void>;
  };
};
