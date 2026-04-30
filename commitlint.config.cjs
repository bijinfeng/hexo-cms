module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 允许的提交类型
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // Bug 修复
        'docs',     // 文档更新
        'style',    // 代码格式调整
        'refactor', // 代码重构
        'perf',     // 性能优化
        'test',     // 测试相关
        'chore',    // 构建/工具链
        'revert',   // 回滚
        'ci',       // CI/CD 配置
      ],
    ],
    // 不限制 subject 的大小写
    'subject-case': [0],
    // subject 不能为空
    'subject-empty': [2, 'never'],
    // type 不能为空
    'type-empty': [2, 'never'],
    // subject 最大长度
    'subject-max-length': [2, 'always', 100],
  },
};
