import { PullBlock } from "roamjs-components/types";

export type BlockRefType = {
  uid: string;
  blockUid: string;
  el?: HTMLElement;
};


export type AliasesBlock = PullBlock & {
  aliases?: Set<string>
}