import {
  Classes,
  Button,
  ButtonGroup,
  Checkbox,
  Icon,
  Popover,
  Menu,
  MenuItem,
} from "@blueprintjs/core";
import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { PullBlock } from "roamjs-components/types";
import { BreadcrumbsBlock } from "./breadcrumbs-block";
import { readConfigFromUid, saveConfigByUid } from "./config-settings";
import {
  useHighlightUnlinkAliases,
  useHighlightWordsInDom,
} from "./find-and-replace-text-in-dom";
import { delay, extension_helper, keys, onRouteChange } from "./helper";
import { roam, roamAliases } from "./roam";
import { AliasesBlock } from "./type";
import fd from "findandreplacedomtext";

const isPage = (block: PullBlock) => {
  return !!block[":node/title"];
};

const EL_CLASS = "rm-unlink-aliases";
const unmount = () => {
  const divs = document.querySelectorAll(`.${EL_CLASS}`);
  if (divs) {
    divs.forEach((div) => div.remove());
  }
};

const mountEl = () => {
  let div = document.querySelector(`.${EL_CLASS}`);
  if (div) {
    return div;
  }
  div = document.createElement("div");
  div.className = EL_CLASS;
  // const article = document.querySelector(".roam-article") as HTMLDivElement;
  const roamArticle = document
    .querySelector(".roam-article")
    .children[1].querySelector(".rm-reference-main").parentElement;
  roamArticle.appendChild(div);
  return div;
};

const getAllAliasesFromPage = (page: PullBlock) => {
  const aliasesForCurrentPage = roamAliases.page(page);
  const aliases = aliasesForCurrentPage
    .map((item) => item[0])
    .reduce((p, c) => {
      return Array.from(new Set([...p, ...c]));
    }, [] as string[]);
  const aliasesBlockUids = aliasesForCurrentPage.map((item) => item[1]);
  return [aliases, aliasesBlockUids] as const;
};

/**
 *
 * 检查除了 `[alias]([[target title]])`, `[[{pageTitle}]]`, `#{pageTitle}` 外
 * 是否还有 alias 字符存在于 source 中
 *
 */
const aliasesFilter2 = (pageTitle: string, alias: string, source: string) => {
  const includes = source.includes(alias);
  if (!includes) {
    return false;
  }
  // console.log(includes, ' = include', source, alias)
  return source
    .replaceAll(`[${alias}]([[${pageTitle}]])`, "")
    .replaceAll(`[[${pageTitle}]]`, "")
    .replaceAll(`#[[${pageTitle}]]`, "")
    .replaceAll(`#${pageTitle}`, "")
    .includes(alias);
};

/**
 * 检查除了 `[]([[]])`外, 还过滤了 `[[alias]]` 和 `[alias]([[...]]) `
 */
const aliasesFilter = (alias: string, source: string) => {
  // 不包含 `[[alias]]` 也不包括 `[alias]([[]])` 后, 还包含 alias
  const includes = source.includes(alias);
  if (!includes) {
    return false;
  }

  const aliasReference = new RegExp(
    `\[(${alias})\]\(\[\[[\w\-]{9}\]\]\)`,
    "gi"
  );

  const pageRererence = new RegExp(`\[\[${alias}\]\]`, "gi");
  //   console.log(source, alias, "---@");
  return source
    .replaceAll(aliasReference, "__")
    .replaceAll(pageRererence, "__")
    .includes(alias);
  //   return true;
};

const dedupPullBlocks = (blocks: PullBlock[]) => {};

// TODO 初始化是添加状态提示,并使用 edit time 在开关时刷新当前页面
const addAliasesToBP = (
  pageTitle: string,
  allblocksAndPages: AliasesBlock[],
  exceptUids: string[],
  aliases: string[]
) => {
  return allblocksAndPages.map((bp) => {
    if (
      exceptUids.some((uid) => {
        return uid === bp[":block/uid"];
      })
    ) {
      return bp;
    }
    const s = bp[":block/string"] || bp[":node/title"] || "";
    aliases.forEach((alias) => {
      const r = aliasesFilter2(pageTitle, alias, s);
      if (r) {
        bp = { ...bp };
        if (!bp.aliases) {
          bp.aliases = new Set([alias]);
        } else {
          bp.aliases.add(alias);
        }
      }
    });
    return bp;
  });
};

const getPageGroupAllUnlinnkReferenceFromAliases = <T extends string>(
  allblocksAndPages: AliasesBlock[],
  aliases: T[],
  caseSensive = true
) => {
  // console.log(allblocksAndPages, "@-@");
  const aliasesCountMap = new Map<string, number>();
  const aliasesGroup = new Map<string, AliasesBlock[]>();
  const filtered = allblocksAndPages.reduce((p, bp) => {
    if (!bp.aliases || !aliases.some((alias) => bp.aliases.has(alias))) {
      return p;
    }
    // console.log(bp, '--')
    // [...bp.aliases].forEach((alias) => {
    //   aliasesGroup.set(alias, aliasesGroup.get(alias) ?? []);
    //   aliasesGroup.get(alias).push(bp);
    //   aliasesCountMap.set(
    //     alias,
    //     aliasesCountMap.get(alias) ? aliasesCountMap.get(alias) : 1
    //   );
    // });
    const id = (
      bp[":node/title"] ? bp[":db/id"] : bp[":block/page"]?.[":db/id"] + ""
    ) as T;
    if (!p[id]) {
      p[id] = new Set([bp]);
    } else {
      p[id].add(bp);
    }
    return p;
  }, new Set());
  return keys(filtered).reduce((p, c) => {
    p[c as string] = [...filtered[c as string]];
    return p;
  }, {} as Record<string, AliasesBlock[]>);
};

const getGroupAllUnlinkReferenceFromAliases = <T extends string>(
  allblocksAndPages: AliasesBlock[],
  aliases: T[],
  caseSensive = true
) => {
  //   console.log(allblocksAndPages, "@-", exceptUids);
  const filtered = allblocksAndPages.reduce((p, bp) => {
    if (!bp.aliases) {
      return p;
    }
    [...bp.aliases].forEach((alias: T) => {
      if (!p[alias]) {
        p[alias] = [bp];
      } else {
        p[alias].push(bp);
      }
    });
    return p;
  }, {} as Record<T, AliasesBlock[]>);
  return filtered;
};

const useTablePagination = (config: { max: number; size: number }) => {
  const [state, _setState] = useState({
    size: config.size,
    index: 0,
  });
  const setState = (partialState: Partial<typeof state>) => {
    _setState((prev) => {
      return {
        ...prev,
        ...partialState,
      };
    });
  };
  const pages = Math.ceil(config.max / state.size);
  return {
    state,
    next() {
      setState({ index: state.index + 1 });
    },
    prev() {
      setState({ index: state.index - 1 });
    },
    hasNext() {
      return pages - 1 > state.index;
    },
    hasPrev() {
      return state.index !== 0;
    },
    getSize() {
      return state.size;
    },
    setSize(size: number) {
      setState({ size, index: 0 });
    },
    pages,
    pagination: {
      start: state.index * state.size,
      end: (state.index + 1) * state.size,
    },
    setPage(i: number) {
      setState({ index: 0 });
    },
  };
};

const TablePagination = (props: ReturnType<typeof useTablePagination>) => {
  return (
    <div className="flex-reverse-row pagination">
      <div className={Classes.SELECT}>
        <select
          onChange={(e) => props.setSize(+e.target.value)}
          value={props.state.size + ""}
        >
          <option value={"20"}>20 / Page</option>
          <option value={"10"}>10 / Page</option>
          <option value={"5"}>5 / Page </option>
          <option value={"1"}>1 / Page</option>
        </select>
      </div>
      <div style={{ width: 20 }} />
      <ButtonGroup>
        {/* <Button icon="double-chevron-left" minimal /> */}
        <Button
          icon="arrow-left"
          minimal
          disabled={!props.hasPrev()}
          onClick={props.prev}
        />
        <Button minimal small>
          {props.state.index + 1}
        </Button>
        <Button
          icon="arrow-right"
          minimal
          disabled={!props.hasNext()}
          onClick={props.next}
        />
        {/* <Button icon="chevron-left" minimal /> */}
        {/* <Button icon="chevron-right" minimal /> */}
        {/* <Button icon="double-chevron-right" minimal /> */}
      </ButtonGroup>
    </div>
  );
};

const useOpenState = (initialOpen = false) => {
  const [open, setOpen] = useState(initialOpen);
  return {
    open,
    setOpen,
  };
};

const Open: FC<ReturnType<typeof useOpenState> & { className?: string }> = (
  props
) => {
  return (
    <div>
      <Icon
        icon={props.open ? "caret-down" : "caret-right"}
        className={`rm-caret bp3-icon-standard hover-opacity ${props.className}`}
        onClick={() => props.setOpen(!props.open)}
        size={14}
      ></Icon>
      {props.children}
    </div>
  );
};

const GroupAlias = (props: { group: string; data: PullBlock[] }) => {
  const tableState = useTablePagination({ max: props.data.length, size: 10 });
  const children = props.data
    .slice(tableState.pagination.start, tableState.pagination.end)
    .map((bp) => {
      if (bp[":node/title"]) {
        return (
          <div key={bp[":block/uid"]}>
            <a
              onClick={(e) => openPage(e, bp[":block/uid"])}
              className="unlink-page rm-page__title no-select"
            >
              {bp[":node/title"]}
            </a>
          </div>
        );
      }
      return (
        <div className="rm-reference-item" key={bp[":block/uid"]}>
          <BreadcrumbsBlock uid={bp[":block/uid"]} showPage />
        </div>
      );
    });
  const openState = useOpenState(true);
  // useHighlightWordsInDom(".rm-unlink-aliases", (el) => {
  //   fd(el, {
  //     find: new RegExp(`(([\S]{2})?)${}(([\S]{2})?)`),
  //     wrap: "span",
  //     wrapClass: "unlink-word",
  //   });
  // });
  useHighlightWordsInDom(".rm-unlink-aliases", (el) => {
    fd(el, {
      find: props.group,
      wrap: "span",
      wrapClass: "unlink-word",
    });
  });
  return (
    <div className="group group-alias">
      <Open {...openState} className="visible">
        <strong>{props.group}</strong>
      </Open>
      {openState.open ? (
        <div style={{ padding: "5px 0" }}>
          {children}
          <TablePagination {...tableState} />
        </div>
      ) : null}
    </div>
  );
};

const openPage = (e: React.MouseEvent<HTMLAnchorElement>, uid: string) => {
  if (e.shiftKey) {
    roam.open.sidebar(uid);
  } else {
    roam.open.mainWindow(uid);
  }
};

const GroupPageAlias = (props: { id: string; data: PullBlock[] }) => {
  const openState = useOpenState(true);
  const page = roam.blockFromId(props.id);
  const data = props.data.filter((bp) => !bp[":node/title"]);
  // console.log(props, " === props", data);
  const tableState = useTablePagination({ max: data.length, size: 10 });
  const content = data
    .slice(tableState.pagination.start, tableState.pagination.end)
    .map((bp) => {
      return (
        <div className="rm-reference-item" key={bp[":block/uid"]}>
          <BreadcrumbsBlock uid={bp[":block/uid"]} showPage />
        </div>
      );
    });
  return (
    <div className="group group-pages">
      <Open {...openState}>
        <strong>
          <a
            className="rm-page__title no-select"
            onClick={(e) => openPage(e, page[":block/uid"])}
          >
            {page[":node/title"]}
          </a>
        </strong>
      </Open>
      {!openState.open ? null : (
        <>
          {content}
          {props.data.length > 20 ? (
            <TablePagination {...tableState}></TablePagination>
          ) : null}
        </>
      )}
    </div>
  );
};

/**
 */
const GroupPages = (props: {
  // groupData: Readonly<[Record<string, AliasesBlock[]>, Map<string, number>]>;
  allblocksAndPages: PullBlock[];
  aliases: string[];
  pageUid: string;
}) => {
  // const [propsData] = props.groupData;

  const config = readConfigFromUid(props.pageUid);
  const resetChecked = () => {
    return props.aliases.reduce((p, c) => {
      p[c] = true;
      return p;
    }, {} as Record<string, boolean>);
  };
  const initChecked = () => {
    return props.aliases.reduce((p, c) => {
      p[c] = config.checked[c] ?? true;
      return p;
    }, {} as Record<string, boolean>);
  };
  const [checked, setChecked] = useState(() => initChecked());
  const validData = useMemo(() => {
    const groupPageIdData = getPageGroupAllUnlinnkReferenceFromAliases(
      props.allblocksAndPages,
      keys(checked).filter((key) => checked[key])
    );
    return groupPageIdData;
  }, [checked]);
  const tableState = useTablePagination({
    max: keys(validData).length,
    size: 10,
  });

  // const checkdHasData = useMemo(() => {
  //   const set = new Set<string>();
  //   keys(validData).forEach((id) => {
  //     validData[id].forEach((bp) => {
  //       [...bp.aliases].forEach((alias) => {
  //         set.add(alias);
  //       });
  //     });
  //   });
  //   return [...set];
  // }, [validData]);
  // validData = [];
  const data = keys(validData)
    .slice(tableState.pagination.start, tableState.pagination.end)
    .map((id) => {
      const pageData = validData[id].filter((bp) => {
        return [...bp.aliases].some((bpAlias) => {
          const result = keys(checked)
            .filter((k) => checked[k])
            .includes(bpAlias);
          return result;
        });
      });
      if (pageData.length === 0) {
        return null;
      }
      return <GroupPageAlias id={id} data={pageData} />;
    });
  useHighlightWordsInDom(".rm-unlink-aliases", (el) => {
    props.aliases
      .filter((alias) => {
        return checked[alias];
      })
      .forEach((alias) => {
        fd(el, {
          find: alias,
          wrap: "span",
          wrapClass: "unlink-word",
        });
      });
  });
  // console.log(data, "---");
  return (
    <div className="">
      <div
        className="flex-row"
        style={{ margin: "4px 8px", justifyContent: "space-between" }}
      >
        <div>
          {props.aliases.map((alias) => {
            return (
              <Checkbox
                inline
                // disabled={!checkdHasData.includes(alias)}
                checked={checked[alias]}
                onChange={() => {
                  const nextChecked = {
                    ...checked,
                    [alias]: !checked[alias],
                  };
                  tableState.setPage(0);
                  setChecked(nextChecked);
                  saveConfigByUid(props.pageUid, {
                    checked: nextChecked,
                  });
                }}
                alignIndicator="right"
                label={alias}
              />
            );
          })}
        </div>
        <div>
          <Button
            icon="reset"
            small
            minimal
            onClick={() => {
              setChecked(resetChecked());
              saveConfigByUid(props.pageUid, {
                checked: resetChecked(),
              });
            }}
          />
        </div>
      </div>
      {data}
      <TablePagination {...tableState} />
    </div>
  );
};

const UnlinkAliases = ({ page }: { page: Partial<PullBlock> }) => {
  const pageUid = page[":block/uid"];
  const config = readConfigFromUid(pageUid);
  const openState = useOpenState(config.open === "1");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<[string[], PullBlock[]]>([[], []] as any);

  const [isGroupAliasMode, setIsGroupAliasMode] = useState(
    config.mode === "alias"
  );

  useEffect(() => {
    saveConfigByUid(pageUid, { mode: isGroupAliasMode ? "alias" : "page" });
  }, [isGroupAliasMode]);
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const checkMount = () => {
    if (!isMounted.current) {
      throw new Error("Comp Unmounted");
    }
  };
  const update = async (reset = false) => {
    setLoading(true);
    // checkMount();
    console.time("Unlink");
    const aliases = await getAllAliasesFromPage(page);
    // checkMount();
    const exceptUids = [pageUid, ...aliases[1]];
    await delay(10);
    if (aliases[0].length) {
      const allblocksAndPages = await roam.allBlockAndPages(exceptUids, reset);
      checkMount();
      // console.time("add");
      const v = addAliasesToBP(
        page[":node/title"],
        allblocksAndPages,
        exceptUids,
        aliases[0]
      );
      // console.timeEnd("add");
      await delay(10);
      checkMount();
      setState([aliases[0], v]);
      // console.log("=v", aliases, v);
    }
    setLoading(false);
    console.timeEnd("Unlink");
  };

  useEffect(() => {
    update();
  }, [pageUid]);

  const [aliase, allblocksAndPages] = state;

  // const aliaseAndBlockUid = useMemo(() => {
  //   const aliases = getAllAliasesFromPage(page);
  //   return aliases;
  // }, [pageUid, updateKey]);

  // const exceptUids = [pageUid, ...aliaseAndBlockUid[1]];

  // console.time("t1");
  // const allblocksAndPages = useMemo(() => {
  //   console.log("memo", pageUid);
  //   return roam.allBlockAndPagesExceptUids(exceptUids);
  // }, [pageUid, updateKey]);
  // console.timeEnd("t1");
  const groupUnlinkReferences = () => {
    const groupData = getGroupAllUnlinkReferenceFromAliases(
      allblocksAndPages,
      aliase
    );
    return keys(groupData).map((key) => {
      return (
        <GroupAlias
          group={key as string}
          data={groupData[key as string]}
        ></GroupAlias>
      );
    });
  };

  const groupByPageUnlinkReferences = () => {
    return (
      <GroupPages
        pageUid={pageUid}
        allblocksAndPages={allblocksAndPages}
        aliases={aliase}
        key={aliase.join(",")}
      />
    );
  };

  const content = isGroupAliasMode
    ? groupUnlinkReferences()
    : groupByPageUnlinkReferences();

  return (
    <div className="">
      <div
        className="rm-ref-page-view"
        style={{ margin: "-4px -4px 0px -16px" }}
      >
        <div className="flex-h-box rm-title-arrow-wrapper">
          <Open
            {...openState}
            setOpen={(next) => {
              openState.setOpen(next);
              saveConfigByUid(pageUid, { open: next ? "1" : "0" });
              next && update();
            }}
          >
            <strong
              style={{
                color: "rgb(206, 217, 224)",
              }}
            >
              Unlinked Aliases References
            </strong>
          </Open>

          {openState.open ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
              }}
            >
              <Popover
                autoFocus={false}
                enforceFocus={false}
                content={
                  <Menu>
                    <MenuItem text="Group" icon="th-list">
                      <MenuItem
                        text="Group By Alias"
                        onClick={() => setIsGroupAliasMode(true)}
                      />
                      <MenuItem
                        text="Group By Page"
                        onClick={() => setIsGroupAliasMode(false)}
                      />
                    </MenuItem>
                    <MenuItem
                      text={"Refresh"}
                      icon="refresh"
                      onClick={() => {
                        update(true);
                      }}
                    />
                  </Menu>
                }
              >
                <Button
                  small
                  minimal
                  icon="cog"
                  // intent={
                  //   level.current !== level.max || sort.index !== 0
                  //     ? "danger"
                  //     : "none"
                  // }
                />
              </Popover>
            </div>
          ) : null}
        </div>
        {openState.open ? (
          <div style={{ marginLeft: 10, marginTop: 10 }}>
            {loading ? <div>...</div> : content}
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};

const init = async () => {
  const pageOrBlockUid =
    await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  unmount();
  if (!pageOrBlockUid) {
    return;
  }
  const block = roam.getPullBlockFromUid(pageOrBlockUid);
  console.log(" mounting ----", pageOrBlockUid, block);

  if (!isPage(block)) {
    return;
  }
  // check if
  setTimeout(() => {
    const el = mountEl();
    ReactDOM.render(<UnlinkAliases page={block} />, el);
  }, 50);
};

export const unlinkAliasesInit = () => {
  extension_helper.on_uninstall(
    onRouteChange(() => {
      init();
    })
  );
  init();
};
