# Conversational Brainstorming & API Schema Compliance Implementation Plan

This plan outlines the technical changes to implement a unified conversational brainstorm workflow inside the Typernova Document Editor and resolve strict LLM API role alternation schema errors.

## User Review Required

> [!IMPORTANT]
> The separate, complex "Agentic Presets" section and "Brainstorm Quick Buttons" will be removed from the editor's sidebar panel to present a clean, distraction-free chat timeline.
> Instead, all brainstorming and document drafting will occur in the dedicated **💡 Diskusi Melayang (Brainstorm Chat Modal)**.
> When the brainstorm session is ready, the user or AI can trigger the actual document generation using `/buat`, `/write`, or `/draft` commands, which will write the brainstorm context directly back to the editor page.

---

## Proposed Changes

### Grok API Service

#### [MODIFY] [grokApi.js](file:///c:/Users/organizer/Downloads/nando-main%20(1)/nando-main/src/services/grokApi.js)
- **API Schema Alignment**:
  - Filter out any messages with `sender === 'system'` from the conversation history mapped to the LLM API payload.
  - Append the text of those system messages directly to the system prompt (`role: 'system'`) to preserve document and template contexts without violating strict role alternation rules (`user` ➔ `assistant` ➔ `user`).
  - Update `buildContextualPrompt` to exclude system messages from the printed history context.

### Typernova Editor Page

#### [MODIFY] [DocumentEditor.jsx](file:///c:/Users/organizer/Downloads/nando-main%20(1)/nando-main/src/components/DocumentEditor.jsx)
- **Auto-scroll Effect**:
  - Added a `useEffect` hook to automatically scroll the brainstorm chat modal container `#bc-messages-container` to the bottom whenever messages change.
- **Write Flag & Commands**:
  - Intercept `/buat`, `/write`, and `/draft` commands inside `handleBrainstormSend`.
  - Close the brainstorm modal, open the sidebar AI panel, and invoke `handleBrainstormWriteToDocument` to generate the document from brainstorm context.
  - Redirect `/draft` and `/agent` commands from the main prompt input box to open the brainstorm chat modal.
- **UI Enhancements**:
  - Add **Buat Dokumen** button to the brainstorm chat header.
  - Remove obsolete brainstorm and agent preset buttons from the sidebar chat panel empty state.
- **Conversational Directives**:
  - Improve the brainstorm chat system prompt to enforce standard conversational dialog, instruct it not to output raw HTML tags (to prevent blanking out in ReactMarkdown), and act as a human-like brainstorming partner.

---

## Verification Plan

### Automated Tests
- Build the project using `npm run build` to verify there are no compilation errors.

### Manual Verification
1. Open the Typernova Document Editor.
2. Click **💡 Diskusi Melayang** in the toolbar to open brainstorm chat.
3. Chat with the AI and verify it scrolls automatically and responds correctly without blanking out.
4. Click **Buat Dokumen** or type `/buat [instructions]` and verify that the document is written back to the editor in real-time.
