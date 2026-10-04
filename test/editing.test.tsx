import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  bulletsWith,
  choose,
  expand,
  paper,
  printed,
  renderApp,
  richEditor,
  section,
} from "./support/app";

describe("header", () => {
  it("edits the name and headline and shows them on paper", async () => {
    const user = userEvent.setup();
    renderApp();
    const header = section("Header");
    const name = within(header).getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Robin Tui");
    const headline = within(header).getByRole("textbox", { name: "Headline" });
    await user.clear(headline);
    await user.type(headline, "Platform Engineer");
    expect(printed.name()).toEqual(["Robin Tui"]);
    expect(printed.headline()).toEqual(["Platform Engineer"]);
  });

  it("adds contact lines from the menu and removes them", async () => {
    const user = userEvent.setup();
    renderApp();
    choose("Add a contact line", "Website");
    await user.type(screen.getByRole("textbox", { name: "Website" }), "rowan.example");
    expect(within(paper()).getByRole("link", { name: "rowan.example" })).toHaveAttribute(
      "href",
      "https://rowan.example",
    );
    await user.click(screen.getByRole("button", { name: "Remove Phone" }));
    expect(printed.contact()).toEqual([
      "rowan.example|linkedin.com/in/example|github.com/example|rowan.ellis@example.com|Glasgow, UK",
    ]);
    choose("Add a contact line", /^Other/);
    await user.type(screen.getByRole("textbox", { name: "Availability" }), "From March");
    expect(printed.extras()).toEqual(["Glasgow, UK · From March"]);
  });
});

describe("sections", () => {
  it("hides, renames, adds and deletes sections", async () => {
    const user = userEvent.setup();
    const { confirm } = renderApp();
    await user.click(screen.getByRole("button", { name: "Hide Projects from the page" }));
    expect(printed.sections()).toEqual(["Experience", "Skills", "Education"]);
    await user.click(screen.getByRole("button", { name: "Show Projects on the page" }));
    expect(printed.sections()).toEqual(["Experience", "Projects", "Skills", "Education"]);

    const title = within(section("Skills")).getByRole("textbox", { name: "Section" });
    await user.clear(title);
    await user.type(title, "Toolbox");
    expect(printed.sections()).toEqual(["Experience", "Projects", "Toolbox", "Education"]);

    await user.selectOptions(screen.getByRole("combobox", { name: "New section" }), "summary");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(section("Summary")).toBeInTheDocument();

    confirm.mockReturnValueOnce(false);
    choose("More for Summary", "Delete Summary");
    expect(section("Summary")).toBeInTheDocument();
    choose("More for Summary", "Delete Summary");
    expect(screen.queryByRole("region", { name: "Summary" })).toBeNull();
  });

  it("offers the right kind of add for each section", () => {
    renderApp();
    expect(
      within(section("Experience")).getByRole("button", { name: "+ Employer" }),
    ).toBeInTheDocument();
    expect(
      within(section("Projects")).getByRole("button", { name: "+ Entry" }),
    ).toBeInTheDocument();
    expect(
      within(section("Skills")).getByRole("button", { name: "+ Category" }),
    ).toBeInTheDocument();
    const education = section("Education");
    expect(within(education).queryByRole("button", { name: /^\+ (Entry|Employer)/ })).toBeNull();
    expect(within(education).getByRole("button", { name: "+ Add bullet" })).toBeInTheDocument();
  });

  it("adds other kinds of content from a section's menu", () => {
    renderApp();
    const projects = section("Projects");
    choose("More for Projects", "Add paragraph", projects);
    act(() => {
      richEditor("Projects paragraph", projects).commands.insertContent("Open source work.");
    });
    expect(printed.paragraphs()).toEqual(["Open source work."]);
    fireEvent.click(within(projects).getByRole("button", { name: "Remove paragraph" }));

    choose("More for Projects", "Add list", projects);
    act(() => {
      richEditor("Projects list", projects).commands.insertContent("A side list");
    });
    // A section's own list prints before its entries.
    expect(printed.bullets()).toEqual(bulletsWith((l) => l.splice(7, 0, "A side list")));

    choose("More for Projects", "Add skill category", projects);
    expect(within(projects).getByRole("textbox", { name: "Category" })).toBeInTheDocument();
    choose("More for Projects", "Add employer with roles", projects);
    expect(within(projects).getAllByRole("textbox", { name: "Role" })).toHaveLength(1);
  });

  it("starts empty sections with a choice of what to add", () => {
    renderApp();
    fireEvent.click(screen.getByRole("tab", { name: "Markdown" }));
    fireEvent.change(screen.getByRole("textbox", { name: "CV as markdown" }), {
      target: { value: "# A\n\n## Empty\n" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Visual" }));
    const empty = section("Empty");
    for (const name of ["+ Employer", "+ Entry", "+ Category", "+ Paragraph"]) {
      expect(within(empty).getByRole("button", { name })).toBeInTheDocument();
    }
    fireEvent.click(within(empty).getByRole("button", { name: "+ Paragraph" }));
    expect(within(empty).getByRole("textbox", { name: "Empty paragraph" })).toBeInTheDocument();
  });
});

describe("entries", () => {
  it("adds a project, fills it in, gives it roles and deletes it", async () => {
    const user = userEvent.setup();
    renderApp();
    const projects = section("Projects");
    await user.click(within(projects).getByRole("button", { name: "+ Entry" }));
    await user.type(
      within(projects).getAllByRole("textbox", { name: "Name" })[0] ?? projects,
      "Kite",
    );
    const fields: [string, string][] = [
      ["Place", "Remote"],
      ["Dates", "2024"],
      ["Link", "kite.example"],
    ];
    for (const [label, text] of fields) {
      await user.type(within(projects).getByRole("textbox", { name: label }), text);
    }
    expect(printed.entries()).toEqual([
      "Fernhill Gardens, Glasgow, UKJun 2021–Present",
      "Paper Lantern Games, Edinburgh, UKSep 2018–May 2021",
      "Night Skygithub.com/example/night-sky",
      "Kite, Remote2024",
    ]);
    expect(printed.blurbs()).toEqual([
      "Garden centre chain with a plant-care app for its loyalty members.",
      "Small studio making puzzle games for phones.",
      "Open-source star chart that follows your phone’s compass.",
      "kite.example",
    ]);
    expect(within(projects).getByText("Remote · 2024")).toBeInTheDocument();

    choose("More for Kite", "Add roles (for promotions)", projects);
    await user.type(within(projects).getByRole("textbox", { name: "Role" }), "Maintainer");
    await user.type(within(projects).getByRole("textbox", { name: "Role dates" }), "2025");
    expect(printed.roles()).toEqual([
      "Lead Mobile EngineerMar 2024–Present",
      "Mobile EngineerJun 2021–Feb 2024",
      "DeveloperSep 2018–May 2021",
      "Maintainer2025",
    ]);
    await user.click(within(projects).getByRole("button", { name: "+ Role" }));
    await user.click(within(projects).getByRole("button", { name: "Remove role Maintainer" }));
    choose("More for Kite", "Delete Kite", projects);
    expect(printed.entries()).toEqual([
      "Fernhill Gardens, Glasgow, UKJun 2021–Present",
      "Paper Lantern Games, Edinburgh, UKSep 2018–May 2021",
      "Night Skygithub.com/example/night-sky",
    ]);
  });

  it("adds an employer with a role ready to fill in", async () => {
    const user = userEvent.setup();
    renderApp();
    const experience = section("Experience");
    await user.click(within(experience).getByRole("button", { name: "+ Employer" }));
    expect(within(experience).getByText("New entry")).toBeInTheDocument();
    const names = within(experience).getAllByRole("textbox", { name: "Name" });
    expect(names.at(-1)).toHaveAttribute("placeholder", "Employer");
    expect(within(experience).getByRole("textbox", { name: "Role" })).toBeInTheDocument();
  });

  it("edits blurbs and bullets as rich text", () => {
    renderApp();
    expand("Fernhill Gardens");
    const blurb = richEditor("Description of Fernhill Gardens");
    act(() => {
      blurb.commands.selectAll();
      blurb.commands.insertContent("Garden software.");
    });
    expect(printed.blurbs()[0]).toBe("Garden software.");
    expand("Paper Lantern Games");
    const bullets = richEditor("Bullets for Developer");
    act(() => {
      bullets.commands.focus("end");
      bullets.commands.splitListItem("listItem");
      bullets.commands.insertContent("Answered player email.");
    });
    expect(printed.bullets()).toEqual(bulletsWith((l) => l.splice(7, 0, "Answered player email.")));
    expand("Night Sky");
    const sky = richEditor("Bullets for Night Sky");
    act(() => {
      sky.commands.selectAll();
      sky.commands.insertContent("Rewrote it");
    });
    expect(printed.bullets()).toEqual(
      bulletsWith((l) => {
        l.splice(7, 0, "Answered player email.");
        l.splice(8, 1, "Rewrote it");
      }),
    );
  });
});

describe("skills", () => {
  it("adds categories and skills as chips", async () => {
    const user = userEvent.setup();
    renderApp();
    const skills = section("Skills");
    await user.click(within(skills).getByRole("button", { name: "+ Category" }));
    const category = within(skills).getAllByRole("textbox", { name: "Category" }).at(-1);
    if (!category) throw new Error("no category");
    await user.type(category, "Spoken");
    await user.type(
      within(skills).getByRole("textbox", { name: "Add to Spoken" }),
      "English, Gaelic{Enter}",
    );
    expect(printed.pairs()).toEqual([
      "Languages: Swift, TypeScript, SQL",
      "Frameworks: SwiftUI, React Native",
      "Tools: Xcode, Figma, Firebase",
      "Spoken: English, Gaelic",
    ]);
    await user.click(within(skills).getByRole("button", { name: "Remove English" }));
    expect(printed.pairs()[3]).toBe("Spoken: Gaelic");
    await user.click(within(skills).getByRole("button", { name: "Remove Spoken" }));
    expect(printed.pairs()).toEqual([
      "Languages: Swift, TypeScript, SQL",
      "Frameworks: SwiftUI, React Native",
      "Tools: Xcode, Figma, Firebase",
    ]);
  });
});
