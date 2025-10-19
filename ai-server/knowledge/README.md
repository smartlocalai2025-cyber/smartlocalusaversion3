# Morrow.AI Knowledge Base

This folder contains knowledge files (.md, .txt, .json) that help Morrow.AI learn from real API calls and business context. You can add files manually or via the /api/knowledge/add endpoint.

- Example: call_xxxxx.json (auto-logged API calls)
- Example: business-insights.md (manual notes)

Morrow.AI loads these files on startup and uses keyword search (across titles and content) to surface relevant snippets. Keep files small (<=10KB per file slice) and prefer concise, high-signal references.
