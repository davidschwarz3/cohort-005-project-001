import { useFetcher } from "react-router";
import { NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { formatRelativeTime } from "~/lib/utils";
import type { Route } from "../routes/+types/courses.$slug.lessons.$lessonId";

export function LessonNote({
  note,
}: {
  note: Route.ComponentProps["loaderData"]["note"];
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const isSaving = fetcher.state !== "idle";
  const error = fetcher.data?.error;

  return (
    <Card className="mb-8">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">Your notes</h2>
        </div>

        <fetcher.Form method="post" className="space-y-3">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={6}
            defaultValue={note?.body ?? ""}
            placeholder="Only you can read this."
            className="max-h-96 min-h-36 resize-y"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
            {!error && note && (
              <span
                suppressHydrationWarning
                className="text-xs text-muted-foreground"
              >
                Last edited {formatRelativeTime(note.updatedAt)}
              </span>
            )}
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}
