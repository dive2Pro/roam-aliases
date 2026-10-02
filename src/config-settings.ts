import { RoamExtensionAPI } from "roam-types";


let API: RoamExtensionAPI;
export const initConfig = (api: RoamExtensionAPI) => {
  API = api;
  api.settings.panel.create(
    {
      tabTitle: "Aliases",
      settings: [
        {
          id: "Keyword",
          name: "Keyword",
          description: "The keyword to use for aliases. Default is 'Aliases'. If you change it, you should also update the page name accordingly.",
          action: {
            type: 'input',
            placeholder: "Aliases",
            onChange(evt) {
              const value = evt.target.value;
              api.settings.set("Keyword", value);
            },
          }
        },
        {
          id: "CaseInsensitive",
          name: "Case insensitive unlinked aliases",
          description:
            "Off (default): match unlinked aliases case-sensitively, keeping the original behavior. On: also match aliases that differ only in letter case (e.g. an alias 'vitamin B12' will match the text 'Vitamin B12').",
          action: {
            type: 'switch',
            onChange(evt) {
              api.settings.set("CaseInsensitive", evt.target.checked);
            },
          }
        },
      ],

    })
};

export function getKeyword() {
  return API.settings.get("Keyword") as string || "Aliases";
}

/**
 * 未链接别名匹配是否大小写不敏感. 默认 false, 保持旧行为 (issue #9 的可选开关)
 */
export function getCaseInsensitive() {
  const value = API.settings.get("CaseInsensitive");
  // switch 行会自动保存布尔值; 这里同时兼容字符串形式, 避免因存储形态不同而失效
  return value === true || value === "true";
}

const CONFIG_PREFIX = "config-";

type Config = {
  open: "1" | "0";
  mode: "page" | "alias";
  checked: Record<string, boolean>;
};

const defaultConfig: Config = {
  open: "0",
  mode: "alias",
  checked: {},
};

export const readConfigFromUid = (uid: string) => {
  const key = CONFIG_PREFIX + uid;
  try {
    const jsonStr = API.settings.get(key) as string;
    const json = JSON.parse(jsonStr);
    return (json || defaultConfig) as Config;
  } catch (e) {
    return defaultConfig;
  }
};

export const saveConfigByUid = (
  uid: string,
  partialConfig: Partial<Config>
) => {
  const key = CONFIG_PREFIX + uid;
  const config = readConfigFromUid(uid);
  API.settings.set(
    key,
    JSON.stringify({
      ...config,
      ...partialConfig,
    })
  );
};

export const resetConfigByUid = (uid: string) => saveConfigByUid(uid, defaultConfig)
