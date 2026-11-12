import { Textarea } from "~/components/ui/textarea";

export const NOTE_FIELD_ROWS = 6;

/**
 * The shared Textarea grows with its content (`field-sizing: content`), which
 * makes the browser ignore `rows`: an empty note collapsed to two lines.
 * A note is a writing space, so it opens at a fixed height and the Student
 * can drag it taller.
 */
export function NoteField({ defaultValue }: { defaultValue: string }) {
  return (
    <Textarea
      name="body"
      rows={NOTE_FIELD_ROWS}
      defaultValue={defaultValue}
      placeholder="Only you can read this."
      aria-label="Your notes"
      className="field-sizing-fixed resize-y"
    />
  );
}
