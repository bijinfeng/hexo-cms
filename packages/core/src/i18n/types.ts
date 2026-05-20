/** 语言标识 */
export type Locale = "zh" | "en" | (string & {});

/** 翻译资源：嵌套对象结构 */
export type TranslationResource = {
  [key: string]: string | TranslationResource;
};

/** 运行时使用的扁平化翻译映射 */
export type TranslationMap = Record<string, string>;

/** I18n 配置 */
export interface I18nConfig {
  /** 支持的语言列表 */
  locales: Locale[];
  /** 默认语言（回退语言） */
  defaultLocale: Locale;
  /** 各语言翻译资源 */
  resources: Record<Locale, TranslationResource>;
}

/**
 * 从嵌套翻译资源类型中提取所有点号分隔的 key 路径。
 * 用法: type Keys = TranslationKeys<typeof zh>;
 * 结果: "common.save" | "common.cancel" | "sidebar.dashboard" | ...
 */
export type TranslationKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? TranslationKeys<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

/** useI18n() 返回值 */
export interface I18nContextValue {
  /** 当前语言 */
  locale: Locale;
  /** 支持的语言列表 */
  locales: Locale[];
  /** 切换语言 */
  setLocale: (locale: Locale) => void;
  /**
   * 翻译函数
   * @param key 点号分隔的翻译键，如 "posts.page.title"
   * @param params 插值参数，替换模板中的 {{key}}
   */
  t: (key: string, params?: Record<string, string | number>) => string;
}
