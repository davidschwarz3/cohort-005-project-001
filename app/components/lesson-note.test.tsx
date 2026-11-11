import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createRoutesStub } from "react-router";
import { LessonNote } from "~/components/lesson-note";
import { plainText } from "~/lib/text";

type Note = Parameters<typeof LessonNote>[0]["note"];

function render(note: Note) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <LessonNote note={note} /> },
  ]);
  return renderToString(<Stub initialEntries={["/"]} />);
}

/** The class list of the first element whose opening tag contains `marker`. */
function classesOf(html: string, marker: string) {
  const tag = html.match(new RegExp(`<[^>]*${marker}[^>]*>`))?.[0];
  if (!tag) throw new Error(`No element with ${marker}`);
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/);
}

const NOTE_FIELD = 'name="body"';
const CARD_CONTENT = 'data-slot="card-content"';

describe("LessonNote", () => {
  it("renders the notes field with the saved note", () => {
    const html = render({
      body: plainText("Remember generics"),
      updatedAt: "2026-11-01",
    });

    expect(html).toMatch(
      /<textarea[^>]*name="body"[^>]*>Remember generics<\/textarea>/
    );
  });

  // The shared Textarea sizes itself to its content (field-sizing: content),
  // which ignores `rows`. Without a floor the empty field shrinks to two lines.
  it("keeps an empty notes field about six lines tall", () => {
    const html = render(null);

    expect(classesOf(html, NOTE_FIELD)).toContain("min-h-36");
  });

  it("caps a long note so it scrolls instead of pushing the lesson down", () => {
    const html = render({
      body: plainText("line\n".repeat(200)),
      updatedAt: "2026-11-01",
    });

    expect(classesOf(html, NOTE_FIELD)).toContain("max-h-96");
  });

  // Card already pads its top; padding the content too doubled the gap above
  // the heading.
  it("does not add top padding inside the card", () => {
    const html = render(null);

    expect(classesOf(html, CARD_CONTENT)).not.toContain("pt-6");
  });
});
