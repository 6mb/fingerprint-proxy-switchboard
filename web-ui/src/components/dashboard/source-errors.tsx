import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SourceErrors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <AlertTriangle className="size-5 text-amber-600" />
        <CardTitle className="text-amber-900">订阅源拉取异常</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-amber-900/80">
        {errors.map((error) => (
          <p key={error} className="break-all">
            {error}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
