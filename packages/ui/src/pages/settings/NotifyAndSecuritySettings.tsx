import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ToggleField } from "./FormField";

export function NotificationSettings() {
  return (
    <Card>
      <CardHeader><CardTitle>通知设置</CardTitle><CardDescription>配置何时接收通知</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ToggleField label="新评论通知" description="有新评论时发送通知" defaultChecked={true} />
        <ToggleField label="部署成功通知" description="部署成功后发送通知" defaultChecked={true} />
        <ToggleField label="部署失败通知" description="部署失败时立即通知" defaultChecked={true} />
        <ToggleField label="垃圾评论通知" description="检测到垃圾评论时通知" defaultChecked={false} />
      </CardContent>
    </Card>
  );
}

export function SecuritySettings() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>访问控制</CardTitle><CardDescription>管理 CMS 的访问权限</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <ToggleField label="需要登录" description="访问 CMS 需要 GitHub 账号登录" defaultChecked={true} />
          <ToggleField label="双因素认证" description="使用 GitHub OAuth 进行身份验证" defaultChecked={true} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>危险操作</CardTitle><CardDescription>这些操作不可逆，请谨慎操作</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--status-error)] bg-[var(--status-error-bg)]">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">清除所有缓存</div>
              <div className="text-xs text-[var(--text-secondary)]">清除本地缓存的文章和媒体数据</div>
            </div>
            <Button variant="destructive" size="sm">清除缓存</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
