import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "../pages/settings";
import { PluginProvider } from "../plugin";

describe("SettingsPage switches", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("can open directly on the plugin settings section", () => {
    render(
      <PluginProvider>
        <SettingsPage initialSection="plugins" />
      </PluginProvider>,
    );

    expect(screen.getByRole("heading", { name: "插件管理" })).toBeInTheDocument();
    expect(screen.getByText("管理可信内置插件和声明式扩展能力")).toBeInTheDocument();
    expect(screen.queryByText("配置博客的基本信息")).not.toBeInTheDocument();
  });

  it("anchors switch thumbs inside the track", async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: "通知设置" }));

    const enabledSwitch = screen.getByRole("switch", { name: "新评论通知" });
    const disabledSwitch = screen.getByRole("switch", { name: "垃圾评论通知" });

    expect(enabledSwitch).toHaveClass("w-10", "h-5", "p-0", "border-0");
    expect(enabledSwitch.querySelector("span")).toHaveClass("left-0.5", "top-0.5", "translate-x-5");
    expect(disabledSwitch.querySelector("span")).toHaveClass("left-0.5", "top-0.5", "translate-x-0");
    expect(disabledSwitch.querySelector("span")).not.toHaveClass("translate-x-0.5");
  });
});
