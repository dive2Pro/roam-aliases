import { PullBlock } from "roam-types";

export type BlockRefType = {
    uid: string;
    blockUid: string;
    el?: HTMLElement;
};


export type AliasesBlock = PullBlock & {
    aliases?: Set<string>
}

