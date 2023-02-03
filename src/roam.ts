import { Toaster } from "@blueprintjs/core";
import { PullBlock } from "roamjs-components/types";
import { delay } from "./helper";

const TITLE = "Aliases";
const PREFIX = "Aliases::";
const ancestorrule = `[ 
   [ (ancestor ?child ?parent) 
        [?parent :block/children ?child] ]
   [ (ancestor ?child ?a) 
        [?parent :block/children ?child ] 
        (ancestor ?parent ?a) ] ] ]`;

const getAliasesUid = () => {
  return window.roamAlphaAPI.pull("[*]", [":node/title", TITLE])[":block/uid"];
};

export const roamAliases = {
  all: () => {
    const result = window.roamAlphaAPI.q(
      `
    [
        :find  ?s ?t
        :where
            [?parent :node/title ?t]
            [?child :block/page ?parent]
            [?child :block/string ?s]
            [(clojure.string/starts-with? ?s  "${PREFIX}")]
            [?child :block/string ?e]
    ]
    
`
    ) as unknown as [string, string][];

    return result.map(([aliases, page]) => {
      return [
        aliases
          .substring(PREFIX.length)
          .split(",")
          .map((s) => s.trim()),
        page,
      ];
    }) as [string[], string][];
  },
  page: (page: PullBlock) => {
    // current page
    // console.time("page");
    const aliasesUid = getAliasesUid();
    if (!aliasesUid) {
      return [];
    }
    const result = window.roamAlphaAPI.data.fast.q(`
[
    :find [(pull ?e [*]) ...]
    :where 
        [?p :block/uid "${page[":block/uid"]}"]
        [?ref1 :block/uid "${aliasesUid}"]
        [?e :block/refs ?ref1] 
        [?e :block/page ?p]
]`) as unknown as PullBlock[];

    const currentPageResult = result.map((block) => {
      return [
        block[":block/string"]
          .substring(PREFIX.length)
          .split(",")
          .map((s) => s.trim()),
        block[":block/uid"],
      ];
    }) as [string[], string][];

    const result2 = window.roamAlphaAPI.data.fast.q(
      `
    [
        :find [(pull ?e [*]) ...]
        :where
          [?ref1 :block/uid "${aliasesUid}"]
          [?e :block/refs ?ref1] 
          [?e :block/string ?s]
          [(clojure.string/starts-with? ?s  "${PREFIX}")]
          [(clojure.string/includes? ?s  "${page[":node/title"]}")]
    ]
`
    ) as unknown as PullBlock[];

    const containsPageResult = result2.filter(block => {
      return block[':block/string'].substring(PREFIX.length).split(",").some( s => s === page[":node/title"])
    }).map((block) => {
      return [
        [
          window.roamAlphaAPI.data.q(`
            [
              :find ?title .
              :in $ ?page
              :where
                [?page :node/title ?title]
            ]
          `, block[":block/page"][":db/id"])
          , ...block[":block/string"]
            .substring(PREFIX.length)
            .split(",")
            .map((s) => s.trim())
            // 过滤掉等于当前页面的 alias
            .filter((s) => s !== page[":node/title"])],
        block[":block/uid"],
      ];
    }) as [string[], string][];
    // console.timeEnd("page");
    // console.log(
    //   currentPageResult,
    //   containsPageResult,
    //   result2,
    //   " -------@",
    //   page[":node/title"],
    //   page,
    //   aliasesUid
    // );

    return currentPageResult.concat(containsPageResult);
  },
  block: () => { },
};

let _allblocks: PullBlock[];
const allBlocks = () => {
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
};

export const roam = {
  allBlockAndPages: async (uids: string[], reset = false) => {
    if (reset || !_allblocks) {
      const toast = Toaster.create({});
      const toastId = toast.show({
        icon: "lightbulb",
        message: "Aliases is loading graph",
        timeout: 0
      });
      await delay()
      _allblocks = allBlocks();
      toast.dismiss(toastId);
    }
    var allblocksAndPages = _allblocks;
    return allblocksAndPages;
  },
  blockFromId: (id: string) => {
    return window.roamAlphaAPI.data.fast.q(
      `[:find (pull ?e [*]) . :in $ ?id :where [?id :block/uid ?uid] [?e :block/uid ?uid]]`,
      +id
    ) as unknown as PullBlock;
  },
  open: {
    mainWindow(uid: string) {
      window.roamAlphaAPI.ui.mainWindow.openBlock({
        block: { uid },
      });
    },
    sidebar(uid: string) {
      window.roamAlphaAPI.ui.rightSidebar.addWindow({
        window: {
          "block-uid": uid,
          type: "block",
        },
      });
    },
  },
  block: {
    open: () => { },
  },
  getPullBlockFromUid: (uid: string) => {
    return window.roamAlphaAPI.pull(
      `
        [
            *
        ]
    `,
      [":block/uid", `${uid}`]
    );
  },
};
