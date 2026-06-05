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

一个端到端的 RAG 知识库系统。用户可通过拖拽或批量上传多格式文档（Markdown/TXT/PDF），系统利用 LlamaParse 或本地降级方案提取文本，按语义分块并经 OpenAI 向量化后存入 pgvector。提问时，DeepSeek 基于检索片段进行流式回答。
核心工程亮点在于“防幻觉溯源”与“无缝交互”：系统强制 LLM 对每个声明生成段落级引用标注，支持全文完整展示与轻量 id 两种回溯模式。前端实现了防抖的流式 XML 渲染、全局可折叠侧边栏、免阻塞的串行批量上传及文件级状态机，为用户提供了极佳的等待与阅读体验。

---

## 你选择不构建什么，以及为什么

**纯视觉图表识别**。当前业界处理纯视觉图表需引入高昂的 VLM（视觉大模型）成本与极高的推理延迟。本系统妥协为提取图表周围的文本标注，并用系统提示词约束 LLM“诚实作答，不盲猜数据”，以此守住事实底线。

**全文关键词搜索**。向量语义检索已覆盖主要查询场景。混合检索（BM25 + 向量）对精确术语有帮助，但作为锦上添花而非 MVP 必须。

**对话历史持久化与多用户系统**。评估场景侧重于单会话的检索问答质量。引入复杂的 Session 管理或 OAuth 鉴权不仅偏离核心目标，还会成倍增加数据库拓扑的复杂度。

---

## 如果再给你 3 天时间

我会将精力全部投入在检索召回率的提升与量化评测上：
首先，实现 BM25 + 向量的混合检索（Hybrid Search）。单纯的向量检索对特定专有名词、编号、代码片段的召回较弱，我会引入倒数排名融合（RRF）算法，结合两路优势，大幅提升 RAG 的基建底盘。
其次，搭建离线量化评测体系。单纯叠加功能无法自证系统的优秀。我会构建一个包含 20 篇领域笔记与 15 个基准问题的测试集，引入 Recall@5 和 MRR 指标。用数据直观证明每一次 Prompt 微调或 Chunking 策略改动带来的准确率提升。
