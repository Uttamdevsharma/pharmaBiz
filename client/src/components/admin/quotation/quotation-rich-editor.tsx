"use client";

import React, { useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Link as LinkIcon,
  Eraser,
  Undo,
  Redo,
} from "lucide-react";

interface QuotationRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function QuotationRichEditor({
  value,
  onChange,
  placeholder = "Write quotation terms, project timeline, and deliverables here...",
}: QuotationRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromProp = useRef(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      isUpdatingFromProp.current = true;
      editorRef.current.innerHTML = value || "";
      isUpdatingFromProp.current = false;
    }
  }, [value]);

  const handleInput = () => {
    if (!isUpdatingFromProp.current && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    const url = prompt("Enter link URL:");
    if (url) {
      exec("createLink", url);
    }
  };

  const handleBlockFormat = (tag: string) => {
    if (!tag) {
      exec("formatBlock", "<p>");
    } else {
      exec("formatBlock", `<${tag}>`);
    }
  };

  return (
    <div className="quotation-quill-wrapper w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950">
      {/* Top Word-Style Toolbar */}
      <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 select-none">
        {/* Heading / Format Selector */}
        <select
          onChange={(e) => handleBlockFormat(e.target.value)}
          defaultValue="p"
          className="h-8 px-2.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
        >
          <option value="p">Paragraph / Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Font Style Buttons */}
        <button
          type="button"
          onClick={() => exec("bold")}
          title="Bold"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition font-bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          title="Italic"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          title="Underline"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition underline"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("strikeThrough")}
          title="Strikethrough"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Text color */}
        <div className="flex items-center gap-1 px-1">
          <label className="text-[11px] font-bold text-zinc-500">Color:</label>
          <input
            type="color"
            onChange={(e) => exec("foreColor", e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border border-zinc-300 bg-transparent"
            title="Text Color"
          />
        </div>

        <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          title="Numbered List"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          title="Bullet List"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Alignments */}
        <button
          type="button"
          onClick={() => exec("justifyLeft")}
          title="Align Left"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("justifyCenter")}
          title="Align Center"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("justifyRight")}
          title="Align Right"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("justifyFull")}
          title="Justify"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Blockquote & Link */}
        <button
          type="button"
          onClick={() => exec("formatBlock", "<blockquote>")}
          title="Blockquote"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleLink}
          title="Insert Link"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Undo / Redo / Clear */}
        <button
          type="button"
          onClick={() => exec("undo")}
          title="Undo"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("redo")}
          title="Redo"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("removeFormat")}
          title="Clear Formatting"
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="min-h-[420px] p-5 text-[13.5px] leading-relaxed focus:outline-none dark:text-zinc-100 overflow-y-auto prose dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400"
        style={{
          minHeight: "420px",
          lineHeight: "1.65",
        }}
      />
    </div>
  );
}
