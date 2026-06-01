import { LockKeyhole, Route } from "lucide-react";
import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLoginMutation, useSessionQuery } from "@/hooks/use-session";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const sessionQuery = useSessionQuery();
  const loginMutation = useLoginMutation();
  const [token, setToken] = useState("");
  const next = searchParams.get("next") || "/dashboard";

  if (sessionQuery.data && (!sessionQuery.data.authRequired || sessionQuery.data.authenticated)) {
    return <Navigate to={next} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Route className="size-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              FP Switchboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">指纹浏览器代理管理台</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>登录</CardTitle>
            <CardDescription>输入管理面板 Token 后进入后台。</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await loginMutation.mutateAsync({ token });
                  toast.success("登录成功");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "登录失败");
                }
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">管理面板 Token</label>
                <div className="relative">
                  <Input
                    type="password"
                    value={token}
                    autoFocus
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="请输入 Token"
                    className="pr-10"
                  />
                  <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending || !token.trim()}
              >
                登录
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
