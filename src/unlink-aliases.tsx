import {
  Classes,
  Button,
  ButtonGroup,
  Checkbox,
  Label,
  Tooltip,
  Icon,
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

const getAllUnlinkReferenceFromAliases = <T extends string>(
  exceptUids: string[],
  aliases: T[],
  caseSensive = true
) => {
  const allblocksAndPages = roam.allBlockAndPagesExceptUids(exceptUids);
  console.log(allblocksAndPages, "@-", exceptUids);
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

const UnlinkAliasesContent: FC = (props) => {
  return (
    <>
      {props.children}
      <div className="flex-reverse-row">
        <div className={Classes.SELECT}>
          <select>
            <option value={20}>20</option>
            <option value={10}>10</option>
            <option value={5}>5</option>
          </select>
        </div>
        <div style={{ width: 20 }} />
        <ButtonGroup>
          {/* <Button icon="double-chevron-left" minimal /> */}
          <Button icon="arrow-left" minimal />
          <Button icon="arrow-right" minimal />
          {/* <Button icon="chevron-left" minimal /> */}
          {/* <Button icon="chevron-right" minimal /> */}
          {/* <Button icon="double-chevron-right" minimal /> */}
        </ButtonGroup>
      </div>
    </>
  );
};

const UnlinkAliases = ({ pageUid }: { pageUid: string }) => {
  const [open, setOpen] = useState(false);
  const aliaseAndBlockUid = useMemo(() => {
    const aliases = getAllAliasesFromPageUid(pageUid);
    return aliases;
  }, [pageUid]);
  const groupUnlinkReferences = useMemo(() => {
    return getAllUnlinkReferenceFromAliases(
      [pageUid, ...aliaseAndBlockUid[1]],
      aliaseAndBlockUid[0]
    );
  }, [pageUid]);
  return (
    <div className="rm-mentions refs-by-page-view">
      <div
        className="rm-ref-page-view"
        style={{ margin: "-4px -4px 0px -16px" }}
      >
        <div className="flex-h-box rm-title-arrow-wrapper">
          <Icon
            icon={open ? "caret-down" : "caret-right"}
            className="rm-caret bp3-icon-standard "
            onClick={() => setOpen(!open)}
            size={16}
          ></Icon>
          <strong
            style={{
              color: "rgb(206, 217, 224)",
            }}
          >
            Unlinked Aliases References
          </strong>
        </div>
        {open ? (
          <UnlinkAliasesContent>
            <div style={{ marginTop: 5 }}>
              {aliaseAndBlockUid[0].map((alias) => {
                return <Checkbox inline alignIndicator="right" label={alias} />;
              })}
            </div>
            <div style={{ marginLeft: 10 }}>
              {keys(groupUnlinkReferences)
                .map((key) => {
                  return groupUnlinkReferences[key].map((bp) => {
                    if (bp[":node/title"]) {
                      return <a>{bp[":node/title"]}</a>;
                    }
                    return <BreadcrumbsBlock uid={bp[":block/uid"]} />;
                  });
                })
                .map((comp) => {
                  return <div className="rm-reference-item">{comp}</div>;
                })}
            </div>
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
