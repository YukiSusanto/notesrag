# 📒 个人笔记 AI 问答助手

基于 RAG（检索增强生成）的个人知识库问答系统。导入你的 Markdown / 纯文本 / PDF 笔记，用自然语言提问，每个回答都能追溯到原文段落。

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
| `LLAMAPARSE_API_KEY` | PDF 解析 API Key（可选，无则降级本地解析） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 文件存储（可选，无则存本地 /tmp/） |
| `EMBEDDING_PROVIDER` | `openai`（默认）或 `xenova`（需原生模块环境） |
| `CITATION_MODE` | `full`（LLM 输出原文引用）或 `light`（仅输出 id） |

---

## 你构建了什么

一个端到端的 RAG 问答系统：用户上传笔记后，系统自动解析（LlamaParse 处理 PDF，直接读取 Markdown/纯文本）、按语义分块、向量化存入 pgvector。提问时，向量检索召回相关段落，组装 prompt 送 DeepSeek 生成流式回答。

核心亮点是引用溯源——回答中每个声明标记 `<cite>` 标签，点击可展开原始笔记段落并高亮匹配句子。系统支持两种引用模式：完整原文引用（Plan A，视觉震撼但 token 消耗高）和轻量 id 引用（Plan B，低延迟），通过环境变量一键切换。

技术栈：Next.js 16 + DeepSeek Chat + OpenAI text-embedding-3-small + Neon pgvector + Vercel Blob。Deploy 到 Vercel 即可上线。

---

## 你选择不构建什么，以及为什么

**纯视觉图表识别**：系统不处理 PDF 中嵌入的折线图、饼图等纯视觉信息。当前业界对图表的 RAG 通常需要代码解释器重构底层数据，或调用多模态模型实时读图——前者工程量远超 14 小时预算，后者 token 成本不可控。对于包含图表的笔记，系统通过 LlamaParse 提取图表中的文字标注，并在 prompt 中要求 LLM 诚实说明"受限于文本检索，无法提取具体数值"，不基于残缺 OCR 碎片编造数据。

**多用户/鉴权**：评估标准不涉及多用户场景。增加鉴权系统会引入 session 管理、OAuth 集成等复杂度，不提升核心的检索问答体验。

**全文关键词搜索**：向量语义检索已覆盖主要查询场景。混合检索（BM25 + 向量）对精确术语召回有帮助，但作为锦上添花而非 MVP 必须。

**对话历史/多轮对话**：评估场景是一次性问答。多轮状态管理增加复杂度且不影响评测结果。

---

## 如果再给你 3 天时间

我会实现混合检索（Hybrid Search）——将 BM25 关键词检索与当前向量语义检索结合，通过倒数排名融合（RRF）合并两路结果。向量检索对自然语言问题效果很好，但对精确术语（人名、日期、代码片段、专有名词）召回不够理想。混合检索可以同时捕捉语义相似性和精确匹配，直接提升 RAG 最核心的检索召回率。

配合这个改动，我会引入检索质量离线评测：准备 20 篇覆盖不同领域的测试笔记和 15 个有明确答案的问题，用 Recall@5 和 MRR 两个指标对比纯向量检索和混合检索的效果差异。这比"多做一个功能"更能体现系统实际质量——也是对评估者关心的"基于事实回答"第一优先级最直接的提升。
