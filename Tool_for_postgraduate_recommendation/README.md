# 导师信息管理

保研导师信息追踪与管理工具，纯前端实现，无需任何构建工具或服务器，打开即用。

## 核心功能

- **导师看板** — 卡片式导师列表，支持按意向程度（A/B/C）、联系进展、院校、职称、关键词多条件筛选
- **院校列表** — 表格化院校管理，支持按学院分组展开导师详情，C9/华五/985/211/双一流 等层次标签
- **时间线** — 报名截止、材料提交、面试等关键事件追踪，日期紧急度着色（红色紧急 / 绿色待办 / 灰色过期）
- **JSON 批量导入** — 粘贴 AI 生成的导师 JSON 数据，支持 Markdown 代码块自动提取、尾部逗号容错、院校自动匹配与新建、预览确认
- **数据导入导出** — JSON 文件导入/导出备份、Markdown 格式导出
- **本地存储** — 所有数据存储在浏览器 localStorage，无需后端

## 快速开始

1. 用浏览器直接打开 `index.html`
2. 点击右下角 **+** 按钮，或在各页面使用新增功能添加数据
3. 无需安装 Node.js、无需 npm install、无需启动服务器

## 技术栈

| 层面 | 技术 |
|------|------|
| 结构 | HTML5 |
| 样式 | CSS3（CSS Variables、Flexbox、Grid） |
| 逻辑 | 原生 JavaScript（ES6+），零框架依赖 |
| 存储 | 浏览器 localStorage |

## 数据结构

### 导师（Advisor）

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 姓名（必填） |
| title | string | 职称：教授 / 副教授 / 讲师 / 研究员 |
| schoolId | string | 关联院校 ID |
| college | string[] | 所属学院（支持多学院数组） |
| researchDirection | string[] | 研究方向 |
| tags | string[] | 自定义标签（如"强推"、"需提前联系"） |
| email | string | 电子邮箱 |
| homepage | string | 个人主页 URL |
| interestLevel | string | 意向程度：A（最想去）/ B（比较想）/ C（备选） |
| progress | string | 联系进展：未联系 / 已发邮件待回复 / 已回复沟通中 / 已面试 / 已确认接收 / 已放弃 |
| lastContactDate | string | 最近联系日期 |
| notes | string | 备注 |

### 院校（School）

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 院校名称 |
| tier | string | 层次：C9 / 华五 / 985 / 211 / 双一流 / 其他 |
| location | string | 所在城市 |
| notes | string | 备注 |

### 事件（Event）

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 类型：报名截止 / 材料提交 / 面试时间 / 结果公布 / 其他 |
| date | string | 日期（YYYY-MM-DD） |
| time | string | 时间 |
| schoolId | string | 关联院校（可选） |
| advisorId | string | 关联导师（可选） |
| description | string | 事件描述 |

## AI 批量导入

1. 点击顶部 "JSON 导入" 按钮
2. 将导师信息截图发送给 AI，附上模态框中预设的提示词
3. 将 AI 返回的 JSON 粘贴到文本框
4. 点击 "解析预览"，核对数据
5. 勾选需要导入的导师，点击 "确认导入"

## 数据安全

所有数据仅在当前浏览器中存储。建议定期使用 "导出 JSON" 按钮备份数据。

## License

MIT License
