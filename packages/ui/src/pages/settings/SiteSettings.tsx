import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { FormField } from "./FormField";

export function SiteSettings() {
  return (
    <Card>
      <CardHeader><CardTitle>站点信息</CardTitle><CardDescription>配置博客的基本信息</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <FormField label="站点名称" description="显示在浏览器标签和 SEO 中"><Input type="text" defaultValue="Kebai's Blog" /></FormField>
        <FormField label="站点描述" description="简短描述你的博客"><Textarea defaultValue="分享技术、生活和思考" rows={3} className="resize-none" /></FormField>
        <FormField label="站点 URL" description="博客的访问地址"><Input type="url" defaultValue="https://kebai.github.io" /></FormField>
        <FormField label="作者名称"><Input type="text" defaultValue="Kebai" /></FormField>
        <FormField label="语言">
          <Select defaultValue="zh-CN">
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="zh-CN">简体中文</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="zh-TW">繁體中文</SelectItem></SelectGroup></SelectContent>
          </Select>
        </FormField>
        <FormField label="时区">
          <Select defaultValue="Asia/Shanghai">
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem><SelectItem value="UTC">UTC</SelectItem></SelectGroup></SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  );
}
