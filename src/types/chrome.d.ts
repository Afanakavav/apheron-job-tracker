// TypeScript declarations for Chrome Extension API

interface ChromeStorage {
  sync: {
    get(keys: string[] | string | null, callback: (items: { [key: string]: any }) => void): void;
    set(items: { [key: string]: any }, callback?: () => void): void;
    remove(keys: string[] | string, callback?: () => void): void;
  };
}

interface ChromeRuntime {
  id: string;
  onMessage: {
    addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
  };
  sendMessage(message: any, responseCallback?: (response: any) => void): void;
  lastError?: {
    message: string;
  };
}

interface ChromeTabs {
  create(createProperties: { url: string }): void;
}

interface ChromeAction {
  onClicked: {
    addListener(callback: (tab: any) => void): void;
  };
}

declare global {
  interface Window {
    chrome?: {
      storage?: ChromeStorage;
      runtime?: ChromeRuntime;
      tabs?: ChromeTabs;
      action?: ChromeAction;
    };
    apheronSaveCredentials?: (userId: string, token: string) => Promise<void>;
  }
  
  const chrome: {
    storage?: ChromeStorage;
    runtime?: ChromeRuntime;
    tabs?: ChromeTabs;
    action?: ChromeAction;
  } | undefined;
}

export {};

