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
    const result = window.roamAlphaAPI.q(
      `
    [
        :find  ?s ?uid
        :in $ %
        :where
            [?parent :block/uid "${page[":block/uid"]}"]
            (ancestor ?child ?parent)
            [?child :block/string ?s]
            [?child :block/uid ?uid]
            [(clojure.string/starts-with? ?s  "${PREFIX}")]
            [?child :block/string ?e]
    ]
`,
      ancestorrule
    ) as unknown as [string, string][];
    const currentPageResult = result.map(([aliases, uid]) => {
      return [
        aliases
          .substring(PREFIX.length)
          .split(",")
          .map((s) => s.trim()),
        uid,
      ];
    }) as [string[], string][];

    const result2 = window.roamAlphaAPI.q(
      `
    [
        :find  ?s ?uid
        :in $ %
        :where
            (ancestor ?child ?parent)
            [?child :block/string ?s]
            [?child :block/uid ?uid]
            [(clojure.string/starts-with? ?s  "${PREFIX}")]
            [(clojure.string/includes? ?s  "${page[":node/title"]}")]
    ]
`,
      ancestorrule
    ) as unknown as [string, string][];
    console.log(result2, " -------@", page[":node/title"], page);
    const containsPageResult = result2.map(([aliases, uid]) => {
      return [
        aliases
          .substring(PREFIX.length)
          .split(",")
          .map((s) => s.trim())
          // 过滤掉等于当前页面的 alias
          .filter(s => s!== page[":node/title"]),
        uid,
      ];
    }) as [string[], string][];

    return currentPageResult.concat(containsPageResult);
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
    return allblocksAndPages
      .filter((bp) => {
        return !uids.some((uid) => uid === bp[":block/uid"]);
      })
      .map((item) => ({ ...item }));
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
    open: () => {},
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
