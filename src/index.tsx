import React, { ReactNode } from "react";
import ReactDom from "react-dom";
import { extension_helper } from "./helper";
import { Button, Divider, Icon, Label } from "@blueprintjs/core";
import "./style.css";

const roam = {
  page: () => {
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
  block: () => {},
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

function onload() {
  observeInputChange();
}

function onunload() {
  extension_helper.uninstall();
}

export default {
  onload,
  onunload,
};

function renderAliases(
  text: string,
  el: HTMLDivElement,
  children: ReactNode[]
) {
  const menuEl = document.createElement("div");
  menuEl.className = "rm-aliases";
  if (!el.querySelector(".rm-aliases")) {
    el.insertBefore(menuEl, el.firstElementChild);
    extension_helper.on_uninstall(() => {
      el.removeChild(menuEl);
    });
  }

  ReactDom.render(<App />, el.querySelector(".rm-aliases"));

  function App() {
    return children.length ? (
      <>
        <div className="sub-title">Aliases</div>
        {children}
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
    const aliases = roam.page();
    $el.oninput = () => {
      const input = getInputText();

      const result: string[] = [];
      const text = input[0];
      text &&
        aliases.forEach((item) => {
          item[0].forEach((str) => {
            if (str.includes(text)) {
              result.push(`[${str.trim()}]([[${item[1]}]])`);
            }
          });
        });

      const children = result.map((item) => {
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
      });

      setTimeout(() => {
        const el = document.querySelector(TARGET_CLASS) as HTMLDivElement;
        el.classList.remove("alias-container");

        if (el) {
          if (children.length) {
            el.classList.add("alias-container");
          } else {
          }
          renderAliases(text, el, children);
        }
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
