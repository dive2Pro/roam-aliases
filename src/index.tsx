import React from "react";
import ReactDom from "react-dom";
import { extension_helper } from "./helper";
import { Button, Divider, Icon, Label } from "@blueprintjs/core";
import "./style.css";

const roam = {
  q: () => {
    const PREFIX = "aliases::";
    const ancestorrule = `[ 
   [ (ancestor ?child ?parent) 
        [?parent :block/children ?child] ]
   [ (ancestor ?child ?a) 
        [?parent :block/children ?child ] 
        (ancestor ?parent ?a) ] ] ]`;
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
};

const TARGET_CLASS = ".rm-autocomplete__results.bp3-elevation-3";
let blockUid: {
  "window-id": string;
  "block-uid": string;
};
let mounted = false;
let $el: HTMLTextAreaElement;

const getInputText = () => {
  const reg = /\[\[.*?\]\]/gi;
  let result = reg.exec($el.value);
  const index = $el.selectionEnd;
  do {
    if (result) {
      const s = result[0];
      const max = result.index + s.length;
      if (max > index && index > result.index) {
        return [s.substring(2, s.length - 2), index, index + s.length] as const;
      }
      result = reg.exec($el.value);
    }
  } while (result);
  return ["", -1, -1] as const;
};
const isPageRefMenu = (li: HTMLElement): boolean => {
  const key = Object.keys(li).filter((key) =>
    key.startsWith("__reactFiber")
  )[0];

  if (key) {
    const fiber = (li as any)[key];
    const searchPage = document.querySelector('[title="Search for a Page"]');
    if (searchPage) {
      //   console.log(li, "--");
      return true;
    } else if (fiber.child?.child && fiber.child.child.key) {
      const isPage = fiber.child.child.key.startsWith("{:node/title");
      //   console.log(isPage, li, " @@@");
      console.log(fiber.child?.child, " = @child");
      return isPage;
    }
  }
  return false;
};

const observeRefMenuOpen = () => {
  let info: BlockRefType;
  //   const observer = createOverlayObserver((mutations) => {
  //     mutations.find((mutation) => {
  //       const li = mutation.target as HTMLElement;
  //       if (!blockUid) {
  //         return;
  //       }
  //       if (isPageRefMenu(li)) {
  //         mounted = true;
  //         const menuEl = li.querySelector(".bp3-menu");
  //         const inputText = getInputText();
  //         console.log(inputText, "----", blockUid, el.value);
  //         // if (!menuEl || menuEl.querySelector(`.${EXPAND_EL_CLASS_NAME}`)) {
  //         //   return;
  //         // }
  //         // const liAnchor = document.createElement("section");
  //         // liAnchor.className = EXPAND_EL_CLASS_NAME;
  //         // menuEl.insertBefore(liAnchor, menuEl.lastElementChild);
  //         setTimeout(() => {
  //           //   mountMenu({
  //           //     ...info,
  //           //     el: liAnchor,
  //           //   });
  //         });
  //       }
  //     });
  //   });
  const roamApp = document.querySelector(".roam-app");

  extension_helper.on_uninstall(() => {
    // observer.disconnect();
  });
};

function onload() {
  observeInputChange();
  observeRefMenuOpen();
}

function onunload() {
  extension_helper.uninstall();
}

export default {
  onload,
  onunload,
};

function renderAliases(
  input: Readonly<[string, number, number]>,
  el: HTMLDivElement,
  aliases: [string[], string][]
) {
  const menuEl = document.createElement("div");
  menuEl.className = "rm-aliases";
  const [text] = input;
  if (!el.querySelector(".rm-aliases")) {
    el.insertBefore(menuEl, el.firstElementChild);
    extension_helper.on_uninstall(() => {
      el.removeChild(menuEl);
    });
  }

  const result: string[] = [];
  text &&
    aliases.forEach((item) => {
      item[0].forEach((str) => {
        if (str.includes(text)) {
          result.push(`[${str.trim()}]([[${item[1]}]])`);
        }
      });
    });

  ReactDom.render(<App />, el.querySelector(".rm-aliases"));

  function App() {
    console.log(text, aliases, " -@@-");
    return result.length ? (
      <>
        <sub>Aliases</sub>
        {result.map((item) => {
          return (
            <div className="dont-focus-block alias">
              <Button
                className="rm-autocomplete-result"
                fill
                minimal
                alignText="left"
                onClick={(e) => {
                  let rangeStart = -1;
                  const replaced = $el.value.replaceAll(
                    `[[${text}]]`,
                    (t, index, allStr) => {
                      if (rangeStart !== -1) {
                        return t;
                      }
                      rangeStart = t.length + index;
                      if (rangeStart < input[2] && rangeStart > input[1]) {
                        return item;
                      }
                      rangeStart = -1;
                      return t;
                    }
                  );
                  console.log(replaced, " replaced");

                  //   $el.value = ;
                  setTimeout(() => {
                    window.roamAlphaAPI.updateBlock({
                      block: {
                        uid: blockUid["block-uid"],
                        string: replaced,
                      },
                    });
                    window.roamAlphaAPI.ui.setBlockFocusAndSelection({
                      location: blockUid,
                      selection: {
                        start: input[1] + item.length - 2,
                        end: input[1] + item.length - 2,
                      },
                    });
                    // $el.setSelectionRange(
                    //   input[1] + item.length - 2,
                    //   input[1] + item.length - 2
                    // );
                  }, 10);
                }}
                rightIcon={<Icon size={12} icon="arrow-right" />}
              >
                {item}
              </Button>
            </div>
          );
        })}
        <Divider />
      </>
    ) : null;
  }
}

function observeInputChange() {
  const id = "textarea.rm-block-input";
  const onLeave = () => {
    mounted = false;
    $el = null;
  };
  const onArrive = (_el: HTMLTextAreaElement) => {
    blockUid = window.roamAlphaAPI.ui.getFocusedBlock();
    $el = _el;
    const aliases = roam.q();
    $el.oninput = () => {
      console.log("- input change---");
      const pageReferenceText = getInputText();
      setTimeout(() => {
        const el = document.querySelector(TARGET_CLASS) as HTMLDivElement;
        el && renderAliases(pageReferenceText, el, aliases);
      }, 10);
    };
  };

  document.leave(id, onLeave);
  document.arrive(id, onArrive);
  extension_helper.on_uninstall(() => {
    document.unbindLeave(id, onArrive);
    document.unbindLeave(id, onLeave);
  });
}
