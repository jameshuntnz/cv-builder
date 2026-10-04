import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { paper, renderApp } from "./support/app";

/** A custom property as set on the first page. */
function pageVar(name: string): string {
  return paper().style.getPropertyValue(name);
}

async function openStyle(): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole("tab", { name: "Style" }));
  return user;
}

function group(name: string): HTMLElement {
  const toggle = screen.getByRole("button", { name: new RegExp(`^(Expand|Collapse) ${name}$`) });
  const fold = toggle.closest<HTMLElement>(".fold");
  if (!fold) throw new Error(`no group ${name}`);
  return fold;
}

describe("style panel: page", () => {
  it("shows the classic defaults and changes nothing until asked", async () => {
    await openStyle();
    const page = within(group("Page"));
    expect(page.getByRole("combobox", { name: "Typeface" })).toHaveValue("charter");
    expect(page.getByRole("spinbutton", { name: "Text size" })).toHaveValue(10);
    expect(page.getByRole("spinbutton", { name: "Line spacing" })).toHaveValue(1.4);
    expect(page.getByRole("spinbutton", { name: "Margins" })).toHaveValue(1.27);
    expect(page.getByRole("checkbox", { name: "Rule under section headings" })).toBeChecked();
    expect(paper().getAttribute("style")).toBeNull();
  });

  it("sets each page setting on the page as a custom property", async () => {
    const user = await openStyle();
    const page = within(group("Page"));
    await user.selectOptions(page.getByRole("combobox", { name: "Typeface" }), "sourceSans");
    expect(pageVar("--cv-font")).toBe('"Source Sans 3", "Helvetica Neue", Arial, sans-serif');
    fireEvent.change(page.getByRole("spinbutton", { name: "Text size" }), {
      target: { value: "11" },
    });
    expect(pageVar("--cv-size")).toBe("11pt");
    fireEvent.change(page.getByRole("spinbutton", { name: "Line spacing" }), {
      target: { value: "1.6" },
    });
    expect(pageVar("--cv-leading")).toBe("1.6");
    fireEvent.change(page.getByRole("spinbutton", { name: "Margins" }), { target: { value: "2" } });
    expect(pageVar("--cv-margin")).toBe("2cm");
    fireEvent.change(page.getByRole("spinbutton", { name: "Space between bullets" }), {
      target: { value: "6" },
    });
    expect(pageVar("--cv-gap")).toBe("6pt");
    fireEvent.input(page.getByLabelText("Text colour"), { target: { value: "#333333" } });
    expect(pageVar("--cv-ink")).toBe("#333333");
    fireEvent.input(page.getByLabelText("Accent colour"), { target: { value: "#1F4E79" } });
    expect(pageVar("--cv-accent")).toBe("#1f4e79");
    await user.selectOptions(page.getByRole("combobox", { name: "Bullet marker" }), "arrow");
    expect(pageVar("--cv-marker")).toBe('"▸"');
    await user.click(page.getByRole("checkbox", { name: "Rule under section headings" }));
    expect(pageVar("--cv-rule-width")).toBe("0");
  });

  it("ignores numbers outside the allowed range", async () => {
    await openStyle();
    const size = within(group("Page")).getByRole("spinbutton", { name: "Text size" });
    fireEvent.change(size, { target: { value: "200" } });
    fireEvent.change(size, { target: { value: "" } });
    expect(pageVar("--cv-size")).toBe("");
  });

  it("warns when a colour would be hard to read, and resets the page", async () => {
    const user = await openStyle();
    const page = within(group("Page"));
    fireEvent.input(page.getByLabelText("Text colour"), { target: { value: "#bbbbbb" } });
    // The accent follows the text colour until it's set, so both warn.
    expect(page.getAllByRole("note").map((n) => n.textContent)).toEqual([
      "Hard to read: 1.9:1 on white, below 4.5:1.",
      "Hard to read: 1.9:1 on white, below 4.5:1.",
    ]);
    expect(within(group("Page")).getByText("· changed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset Page" }));
    expect(page.queryByRole("note")).toBeNull();
    expect(paper().getAttribute("style")).toBe("");
  });
});

describe("style panel: each part", () => {
  it("styles one part on its own, and resets it", async () => {
    const user = await openStyle();
    await user.click(screen.getByRole("button", { name: "Expand Section headings" }));
    const section = within(group("Section headings"));
    expect(section.getByRole("spinbutton", { name: "Size" })).toHaveValue(12);
    expect(section.getByRole("checkbox", { name: "Bold" })).toBeChecked();
    expect(section.getByRole("combobox", { name: "Typeface" })).toHaveValue("");

    await user.selectOptions(section.getByRole("combobox", { name: "Typeface" }), "times");
    fireEvent.change(section.getByRole("spinbutton", { name: "Size" }), {
      target: { value: "14" },
    });
    fireEvent.change(section.getByRole("spinbutton", { name: "Space above" }), {
      target: { value: "20" },
    });
    fireEvent.input(section.getByLabelText("Colour"), { target: { value: "#7a1f1f" } });
    await user.selectOptions(section.getByRole("combobox", { name: "Letters" }), "upper");
    await user.click(section.getByRole("checkbox", { name: "Bold" }));
    await user.click(section.getByRole("checkbox", { name: "Italic" }));
    expect(pageVar("--cv-section-font")).toBe('"Times New Roman", Times, serif');
    expect(pageVar("--cv-section-size")).toBe("14pt");
    expect(pageVar("--cv-section-space")).toBe("20pt");
    expect(pageVar("--cv-section-color")).toBe("#7a1f1f");
    expect(pageVar("--cv-section-transform")).toBe("uppercase");
    expect(pageVar("--cv-section-weight")).toBe("400");
    expect(pageVar("--cv-section-style")).toBe("italic");

    await user.selectOptions(section.getByRole("combobox", { name: "Typeface" }), "");
    expect(pageVar("--cv-section-font")).toBe("");
    await user.click(screen.getByRole("button", { name: "Reset Section headings" }));
    expect(pageVar("--cv-section-size")).toBe("");
    expect(screen.queryByRole("button", { name: "Reset Section headings" })).toBeNull();
  });

  it("offers space above only for the parts that have it", async () => {
    const user = await openStyle();
    await user.click(screen.getByRole("button", { name: "Expand Dates" }));
    expect(within(group("Dates")).queryByRole("spinbutton", { name: "Space above" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Expand Job titles" }));
    expect(
      within(group("Job titles")).getByRole("spinbutton", { name: "Space above" }),
    ).toHaveValue(7);
  });
});

describe("style panel: presets, markdown and undo", () => {
  it("applies a preset, writes it into the markdown, and undoes it", async () => {
    const user = await openStyle();
    await user.click(screen.getByRole("button", { name: /^Modern/ }));
    expect(pageVar("--cv-font")).toBe('"Source Sans 3", "Helvetica Neue", Arial, sans-serif');
    expect(pageVar("--cv-section-transform")).toBe("uppercase");
    await user.click(screen.getByRole("tab", { name: "Markdown" }));
    const md = screen.getByRole("textbox", { name: "CV as markdown" });
    expect(md.textContent.split("\n").slice(0, 3)).toEqual([
      "---",
      "page.font: sourceSans",
      "page.size: 10.5",
    ]);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(paper().getAttribute("style")).toBe("");
    await user.click(screen.getByRole("tab", { name: "Style" }));
    await user.click(screen.getByRole("button", { name: /^Minimal/ }));
    expect(pageVar("--cv-marker")).toBe('"–"');
    await user.click(screen.getByRole("button", { name: /^Classic/ }));
    expect(paper().getAttribute("style")).toBe("");
  });
});
