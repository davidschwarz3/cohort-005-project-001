import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NOTE_FIELD_ROWS, NoteField } from "./note-field";

function render(defaultValue = "") {
  const html = renderToStaticMarkup(<NoteField defaultValue={defaultValue} />);
  const classes = html.match(/class="([^"]*)"/)?.[1].split(" ") ?? [];
  return { html, classes };
}

describe("NoteField", () => {
  it("opens at a fixed height so its rows are honoured", () => {
    const { html, classes } = render();
    expect(html).toContain(`rows="${NOTE_FIELD_ROWS}"`);
    expect(classes).toContain("field-sizing-fixed");
    expect(classes).not.toContain("field-sizing-content");
  });

  it("lets the Student drag it taller", () => {
    expect(render().classes).toContain("resize-y");
  });

  it("posts the note as the body field, prefilled with the saved note", () => {
    const { html } = render("Generics are neat");
    expect(html).toContain('name="body"');
    expect(html).toContain("Generics are neat");
  });
});
