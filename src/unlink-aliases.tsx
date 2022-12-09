import {
  Classes,
  Button,
  ButtonGroup,
  Checkbox,
  Label,
  Tooltip,
  Icon,
  Popover,
} from "@blueprintjs/core";
import { FC, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { PullBlock } from "roamjs-components/types";
import { BreadcrumbsBlock } from "./breadcrumbs-block";
import { extension_helper, keys, onRouteChange } from "./helper";
import { roam, roamAliases } from "./roam";

const getPullBlockFromUid = (uid: string) => {
  return window.roamAlphaAPI.pull(
    `
        [
            *
        ]
    `,
    [":block/uid", `${uid}`]
  );
};

const isPage = (block: PullBlock) => {
  return !!block[":node/title"];
};

const EL_CLASS = "rm-unlink-aliases";
const unmount = () => {
  const roamArticle = document.querySelector(".roam-article") as HTMLDivElement;
  const div = roamArticle.querySelector(`.${EL_CLASS}`);
  if (div) {
    roamArticle.removeChild(div);
  }
};

const mountEl = () => {
  const div = document.createElement("div");
  div.className = EL_CLASS;
  const roamArticle = document.querySelector(".roam-article") as HTMLDivElement;
  roamArticle.appendChild(div);
  return div;
};

const getAllAliasesFromPageUid = (uid: string) => {
  const aliasesForCurrentPage = roamAliases.page(uid);
  const aliases = aliasesForCurrentPage
    .map((item) => item[0])
    .reduce((p, c) => {
      return Array.from(new Set([...p, ...c]));
    }, [] as string[]);
  const aliasesBlockUids = aliasesForCurrentPage.map((item) => item[1]);
  return [aliases, aliasesBlockUids] as const;
};

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
  console.log(source, alias, "---@");
  return source
    .replaceAll(aliasReference, "__")
    .replaceAll(pageRererence, "__")
    .includes(alias);
  //   return true;
};

const getGroupAllUnlinkReferenceFromAliases = <T extends string>(
  //   exceptUids: string[],
  allblocksAndPages: PullBlock[],
  aliases: T[],
  caseSensive = true
) => {
  //   console.log(allblocksAndPages, "@-", exceptUids);
  const filtered = allblocksAndPages.reduce((p, bp) => {
    const s = bp[":block/string"] || bp[":node/title"] || "";
    aliases.forEach((alias) => {
      if (aliasesFilter(alias, s)) {
        if (!p[alias]) {
          p[alias] = [bp];
        } else {
          p[alias].push(bp);
        }
      }
    });
    return p;
  }, {} as Record<T, PullBlock[]>);
  return filtered;
};

const useTablePagination = (config: { max: number }) => {
  const [state, _setState] = useState({
    size: 1,
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
    setSize(size: number) {
      setState({ size, index: 0 });
    },
    pages,
    pagination: {
      start: state.index * state.size,
      end: (state.index + 1) * state.size,
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

const Open: FC<ReturnType<typeof useOpenState>> = (props) => {
  return (
    <div>
      <Icon
        icon={props.open ? "caret-down" : "caret-right"}
        className="rm-caret bp3-icon-standard hover-opacity"
        onClick={() => props.setOpen(!props.open)}
        size={14}
      ></Icon>
      {props.children}
    </div>
  );
};

const GroupAlias = (props: { group: string; data: PullBlock[] }) => {
  const tableState = useTablePagination({ max: props.data.length });
  const children = props.data
    .slice(tableState.pagination.start, tableState.pagination.end)
    .map((bp) => {
      if (bp[":node/title"]) {
        return (
          <div key={bp[":block/uid"]}>
            <a className="unlink-page">{bp[":node/title"]}</a>
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

  return (
    <div>
      <Open {...openState}>
        <strong>{props.group}</strong>
      </Open>
      {openState.open ? (
        <>
          {children}
          <TablePagination {...tableState} />
        </>
      ) : null}
    </div>
  );
};

const UnlinkAliasesContent: FC = (props) => {
  return <>{props.children}</>;
};

const UnlinkAliases = ({ pageUid }: { pageUid: string }) => {
  const openState = useOpenState(false);
  const [isGroupAliasMode, setIsGroupAliasMode] = useState(true);
  const aliaseAndBlockUid = useMemo(() => {
    const aliases = getAllAliasesFromPageUid(pageUid);
    return aliases;
  }, [pageUid]);

  const exceptUids = [pageUid, ...aliaseAndBlockUid[1]];

  const allblocksAndPages = useMemo(() => {
    return roam.allBlockAndPagesExceptUids(exceptUids);
  }, [pageUid]);

  const groupUnlinkReferences = useMemo(() => {
    const groupData = getGroupAllUnlinkReferenceFromAliases(
      allblocksAndPages,
      aliaseAndBlockUid[0]
    );
    return keys(groupData).map((key) => {
      return <GroupAlias group={key} data={groupData[key]}></GroupAlias>;
    });
  }, [allblocksAndPages]);

    const groupByPageUnlinkReferences = useMemo(() => {
      
  }, [allblocksAndPages]);

  const content = isGroupAliasMode ? groupUnlinkReferences : null;
  return (
    <div className="rm-mentions refs-by-page-view">
      <div
        className="rm-ref-page-view"
        style={{ margin: "-4px -4px 0px -16px" }}
      >
        <div className="flex-h-box rm-title-arrow-wrapper">
          <Open {...openState}>
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
              <Popover>
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
          <UnlinkAliasesContent>
            <div style={{ marginTop: 5 }}>
              {aliaseAndBlockUid[0].map((alias) => {
                return <Checkbox inline alignIndicator="right" label={alias} />;
              })}
            </div>
            <div style={{ marginLeft: 10 }}>{content}</div>
          </UnlinkAliasesContent>
        ) : null}
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
  const block = getPullBlockFromUid(pageOrBlockUid);
  if (!isPage(block)) {
    return;
  }
  // check if
  const el = mountEl();
  ReactDOM.render(<UnlinkAliases pageUid={pageOrBlockUid} />, el);
};

export const unlinkAliasesInit = () => {
  extension_helper.on_uninstall(onRouteChange(init));
  init();
};
