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
      ],

    })
};

export function getKeyword() {
  return API.settings.get("Keyword") as string || "Aliases";
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
