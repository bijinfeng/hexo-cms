import type { TranslationKeys } from "@hexo-cms/core";
import type { zh } from "./zh";

/**
 * 所有翻译键的联合类型，提供 t() 调用的类型安全和自动补全。
 * 用法: const key: TranslationKey = "common.save";
 */
export type TranslationKey = TranslationKeys<typeof zh>;
