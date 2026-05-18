import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

import {
  getCopyMarkdownButtonEnabled,
  getHeadingMarkerEnabled,
  getCopyTitleHoverEnabled,
  setCopyMarkdownButtonEnabled,
  setHeadingMarkerEnabled,
  setCopyTitleHoverEnabled,
} from "../../lib/notion-enhancer-settings";
import { extensionName } from "../../lib/notion-enhancer-metadata";

type ToggleSettingStatus = "loading" | "ready" | "saving" | "error";

interface ToggleSettingState {
  status: ToggleSettingStatus;
  enabled: boolean;
}

interface ToggleItemProps {
  title: string;
  description: string;
  icon: string;
  switchLabel: string;
  state: ToggleSettingState;
  onToggle: () => void;
}

const ToggleItem = ({
  title,
  description,
  icon,
  switchLabel,
  state,
  onToggle,
}: ToggleItemProps) => {
  return (
    <section className={`toggle-item toggle-item--${state.status}`}>
      <div className="toggle-item__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="toggle-item__copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <label className="toggle-item__control">
        <span className="toggle-state">{state.enabled ? "ON" : "OFF"}</span>
        <button
          className="toggle-button"
          type="button"
          role="switch"
          aria-checked={state.enabled}
          aria-label={switchLabel}
          onClick={onToggle}
          disabled={state.status === "loading" || state.status === "saving"}
        >
          <span className="toggle-button__track">
            <span className="toggle-button__label">{state.enabled ? "ON" : "OFF"}</span>
            <span className="toggle-button__thumb" />
          </span>
        </button>
      </label>
    </section>
  );
};

const App = () => {
  const [copyMarkdownButtonState, setCopyMarkdownButtonState] = useState<ToggleSettingState>({
    status: "loading",
    enabled: true,
  });
  const [headingMarkerState, setHeadingMarkerState] = useState<ToggleSettingState>({
    status: "loading",
    enabled: true,
  });
  const [copyTitleHoverState, setCopyTitleHoverState] = useState<ToggleSettingState>({
    status: "loading",
    enabled: true,
  });

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async (): Promise<void> => {
      try {
        const [copyMarkdownButtonEnabled, headingMarkerEnabled, copyTitleHoverEnabled] =
          await Promise.all([
            getCopyMarkdownButtonEnabled(browser.storage.local),
            getHeadingMarkerEnabled(browser.storage.local),
            getCopyTitleHoverEnabled(browser.storage.local),
          ]);
        if (!isMounted) {
          return;
        }

        setCopyMarkdownButtonState({
          status: "ready",
          enabled: copyMarkdownButtonEnabled,
        });
        setHeadingMarkerState({
          status: "ready",
          enabled: headingMarkerEnabled,
        });
        setCopyTitleHoverState({
          status: "ready",
          enabled: copyTitleHoverEnabled,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setCopyMarkdownButtonState({
          status: "error",
          enabled: true,
        });
        setHeadingMarkerState({
          status: "error",
          enabled: true,
        });
        setCopyTitleHoverState({
          status: "error",
          enabled: true,
        });
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleHeadingMarkerToggle = async (): Promise<void> => {
    const nextEnabled = !headingMarkerState.enabled;

    setHeadingMarkerState({
      status: "saving",
      enabled: nextEnabled,
    });

    try {
      await setHeadingMarkerEnabled(browser.storage.local, nextEnabled);
      setHeadingMarkerState({
        status: "ready",
        enabled: nextEnabled,
      });
    } catch {
      setHeadingMarkerState({
        status: "error",
        enabled: !nextEnabled,
      });
    }
  };

  const handleCopyMarkdownButtonToggle = async (): Promise<void> => {
    const nextEnabled = !copyMarkdownButtonState.enabled;

    setCopyMarkdownButtonState({
      status: "saving",
      enabled: nextEnabled,
    });

    try {
      await setCopyMarkdownButtonEnabled(browser.storage.local, nextEnabled);
      setCopyMarkdownButtonState({
        status: "ready",
        enabled: nextEnabled,
      });
    } catch {
      setCopyMarkdownButtonState({
        status: "error",
        enabled: !nextEnabled,
      });
    }
  };

  const handleCopyTitleHoverToggle = async (): Promise<void> => {
    const nextEnabled = !copyTitleHoverState.enabled;

    setCopyTitleHoverState({
      status: "saving",
      enabled: nextEnabled,
    });

    try {
      await setCopyTitleHoverEnabled(browser.storage.local, nextEnabled);
      setCopyTitleHoverState({
        status: "ready",
        enabled: nextEnabled,
      });
    } catch {
      setCopyTitleHoverState({
        status: "error",
        enabled: !nextEnabled,
      });
    }
  };

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="notion-mark" aria-hidden="true">
          N
        </div>
        <div>
          <p className="subtitle">Notion to Markdown</p>
          <h1>{extensionName}</h1>
        </div>
      </header>

      <section className="settings-list" aria-label="機能設定">
        <ToggleItem
          title="Markdown コピー"
          description="Notion ページを Markdown としてコピーします。"
          icon="□"
          switchLabel="コピーボタンを切り替える"
          state={copyMarkdownButtonState}
          onToggle={() => {
            void handleCopyMarkdownButtonToggle();
          }}
        />

        <ToggleItem
          title="見出しマーカー"
          description="見出しの横に Markdown 記法の目印を表示します。"
          icon="H"
          switchLabel="見出しマーカーを切り替える"
          state={headingMarkerState}
          onToggle={() => {
            void handleHeadingMarkerToggle();
          }}
        />

        <ToggleItem
          title="タイトル hover UI"
          description="タイトルに触れたときコピー操作を表示します。"
          icon="T"
          switchLabel="タイトルhoverボタンを切り替える"
          state={copyTitleHoverState}
          onToggle={() => {
            void handleCopyTitleHoverToggle();
          }}
        />
      </section>
    </main>
  );
};

export default App;
