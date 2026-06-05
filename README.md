# 📒 个人笔记 AI 问答助手

基于 RAG（检索增强生成）的个人知识库问答系统。导入 Markdown / 纯文本 / PDF 笔记，用自然语言提问，每个回答都能追溯到原文段落。

## 特性

- 🔍 **RAG 问答**：向量语义检索 + DeepSeek 流式生成，回答基于笔记事实
- 📎 **引用溯源**：段落级高亮，点击引用标签展开原始笔记，双模式（完整原文 / 轻量 id）
- 📤 **批量上传**：拖拽 + 多选，串行处理，文件级进度指示器
- 📁 **笔记分类**：文件夹分组管理，不影响全局检索
- 🗂️ **折叠侧边栏**：左侧导航，图标/文字两种模式
- 📄 **多格式支持**：Markdown / 纯文本 / PDF（LlamaParse 主线 + pdfjs-dist 降级）

## 快速开始

```bash
npm install
npm run setup-db       # 初始化数据库表
npm run dev            # http://localhost:3000
```

## 环境变量

复制 `.env.local` 并填入真实值：

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key（LLM） |
| `OPENAI_API_KEY` | OpenAI API Key（Embedding） |
| `EMBED_BASE_URL` | Embedding 中转站地址（默认 api.openai.com） |
| `DATABASE_URL` | Neon Postgres 连接串（需开启 pgvector 扩展） |
| `POSTGRES_URL` | 同上（@vercel/postgres 兼容） |
| `LLAMAPARSE_API_KEY` | PDF 解析 API Key（可选） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 文件存储 Token（可选） |
| `EMBEDDING_PROVIDER` | `openai`（默认） |
| `CITATION_MODE` | `full`（原文引用）或 `light`（仅 id） |
| `ACCESS_PASSWORD` | 访问密码（留空不启用） |

## 技术栈

Next.js 16 + DeepSeek Chat + OpenAI text-embedding-3-small + Neon pgvector + Vercel Blob + Vercel AI SDK

---

## 你构建了什么

一个端到端的 RAG 问答系统。用户通过拖拽或批量选择上传 Markdown、纯文本或 PDF 笔记，系统调用 LlamaParse（PDF）或直接读取（文本）提取内容，按语义边界分块后通过 OpenAI Embedding 向量化存入 pgvector。提问时，DeepSeek 基于检索到的相关片段流式生成回答。

核心设计是引用溯源：每个声明标注来源编号，点击可展开原始段落并高亮匹配句子。系统支持两种引用模式——完整原文引用（视觉震撼）和轻量 id 引用（低延迟），通过环境变量切换。前端提供了可折叠侧边栏导航、批量上传进度指示器、笔记文件夹分类系统。所有回答受 prompt 约束，笔记内容不足时诚实告知而非编造。

---

## 你选择不构建什么，以及为什么

**纯视觉图表识别**。系统不处理折线图、饼图等纯视觉信息——当前业界对图表的 RAG 需要多模态模型实时读图，成本不可控且超出预算。系统通过 LlamaParse 提取图表中的文字标注，并在 prompt 中要求 LLM 诚实说明"受限于文本检索，无法提取具体数值"。

**多用户/鉴权系统**。评估标准不涉及多用户场景。增加 session 管理、OAuth 集成会引入不提升核心检索问答体验的复杂度。

**全文关键词搜索**。向量语义检索已覆盖主要查询场景。混合检索（BM25 + 向量）对精确术语有帮助，但作为锦上添花而非 MVP 必须。

**对话历史持久化**。评估场景是一次性问答。多轮对话状态管理增加复杂度且不影响评测结果。

---

## 如果再给你 3 天时间

我会实现混合检索——将 BM25 关键词检索与当前向量语义检索结合，通过倒数排名融合合并两路结果。向量检索对自然语言问题效果很好，但对精确术语（人名、日期、代码片段、专有名词）召回不够。混合检索同时捕捉语义相似性和精确匹配，直接提升 RAG 最核心的检索召回率。

配合这个改动，我会建立离线评测体系：准备 20 篇覆盖多领域的测试笔记和 15 个有明确答案的问题，用 Recall@5 和 MRR 两个指标对比纯向量检索和混合检索的效果。这比"多做几个功能"更能体现系统实际质量——也是对评估者关心的"基于事实回答"第一优先级最直接的提升。
