import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { FormField } from "./FormField";

export function ProfileSettings() {
  return (
    <Card>
      <CardHeader><CardTitle>个人资料</CardTitle><CardDescription>管理你的账户信息</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-default)]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-2xl font-bold">K</div>
          <div>
            <Button variant="outline" size="sm">更换头像</Button>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">支持 JPG、PNG，最大 2MB</p>
          </div>
        </div>
        <FormField label="显示名称"><Input type="text" defaultValue="Kebai" /></FormField>
        <FormField label="邮箱"><Input type="email" defaultValue="kebai@example.com" /></FormField>
        <FormField label="个人简介"><Textarea defaultValue="全栈开发者，热爱开源" rows={3} className="resize-none" /></FormField>
      </CardContent>
    </Card>
  );
}
