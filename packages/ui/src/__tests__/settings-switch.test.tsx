import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SettingsPage } from "../pages/settings";
import { PluginProvider } from "../plugin";
import { I18nTestWrapper } from "./i18n-test-wrapper";
import { createMockPluginHost } from "./test-utils";

describe("SettingsPage switches", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("can open directly on the plugin settings section", () => {
    render(
      <I18nTestWrapper>
        <PluginProvider host={createMockPluginHost()}>
          <SettingsPage initialSection="plugins" />
        </PluginProvider>
      </I18nTestWrapper>,
    );

    expect(screen.getByRole("heading", { name: "插件管理" })).toBeInTheDocument();
    expect(screen.getByText("管理可信内置插件和声明式扩展能力")).toBeInTheDocument();
    expect(screen.queryByText("配置博客的基本信息")).not.toBeInTheDocument();
  });

  it("anchors switch thumbs inside the track", async () => {
    const user = userEvent.setup();

    render(
      <I18nTestWrapper>
        <SettingsPage />
      </I18nTestWrapper>,
    );

    await user.click(screen.getByRole("tab", { name: "通知设置" }));

    const enabledSwitch = screen.getByRole("switch", { name: "新评论通知" });
    const disabledSwitch = screen.getByRole("switch", { name: "垃圾评论通知" });

    const enabledThumb = enabledSwitch.querySelector("span");
    const disabledThumb = disabledSwitch.querySelector("span");

    expect(enabledSwitch).toHaveClass("w-9", "h-5", "border-2");
    expect(enabledSwitch).toHaveAttribute("data-state", "checked");
    expect(enabledThumb).toHaveClass(
      "size-4",
      "data-[state=checked]:translate-x-4",
      "data-[state=unchecked]:translate-x-0",
    );
    expect(enabledThumb).toHaveAttribute("data-state", "checked");
    expect(disabledThumb).toHaveAttribute("data-state", "unchecked");
  });
});
