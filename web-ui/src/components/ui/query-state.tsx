import { AlertCircle, LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QueryState({
  title,
  description,
  compact = true,
  loading = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={compact ? "" : "page-shell flex min-h-screen items-center justify-center"}>
      <Card className={compact ? "" : "w-full max-w-lg"}>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          {loading ? (
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <AlertCircle className="size-5 text-muted-foreground" />
          )}
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
