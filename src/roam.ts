import { PullBlock } from "roamjs-components/types";

const PREFIX = "Aliases::";
const ancestorrule = `[ 
   [ (ancestor ?child ?parent) 
        [?parent :block/children ?child] ]
   [ (ancestor ?child ?a) 
        [?parent :block/children ?child ] 
        (ancestor ?parent ?a) ] ] ]`;

export const roamAliases = {
  all: () => {
    const result = window.roamAlphaAPI.q(
      `
    [
        :find  ?s ?t
        :in $ %
        :where
            [?parent :node/title ?t]
            (ancestor ?child ?parent)
            [?child :block/string ?s]
            [(clojure.string/starts-with? ?s  "${PREFIX}")]
            [?child :block/string ?e]
    ]
    
`,
      ancestorrule
    ) as unknown as [string, string][];

    return result.map(([aliases, page]) => {
      return [aliases.substring(PREFIX.length).split(","), page];
    }) as [string[], string][];
  },
  page: (uid: string) => {
    const result = window.roamAlphaAPI.q(
      `
    [
        :find  ?s ?uid
        :in $ %
        :where
            [?parent :block/uid "${uid}"]
            (ancestor ?child ?parent)
            [?child :block/string ?s]
            [?child :block/uid ?uid]
            [(clojure.string/starts-with? ?s  "${PREFIX}")]
            [?child :block/string ?e]
    ]
`,
      ancestorrule
    ) as unknown as [string, string][];
    return result.map(([aliases, uid]) => {
      return [aliases.substring(PREFIX.length).split(","), uid];
    }) as [string[], string][];
  },
  block: () => {},
};

export const roam = {
  allBlockAndPages: () => {
    const allblocksAndPages = window.roamAlphaAPI.data.fast.q(
      `
    [
      :find [(pull ?e [*]) ...]
      :where
       [?e :block/uid]
    ]
    `
    ) as unknown as PullBlock[];
    return allblocksAndPages;
  },
  allBlockAndPagesExceptUids: (uids: string[]) => {
    var allblocksAndPages = window.roamAlphaAPI.data.fast.q(
      `
    [
      :find [(pull ?e [*]) ...]
      :where
       [?e :block/uid]
    ]
    `
    ) as unknown as PullBlock[];
    return allblocksAndPages.filter((bp) => {
      return !uids.some((uid) => uid === bp[":block/uid"]);
    });
  },
};
