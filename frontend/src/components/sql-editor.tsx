"use client";

import { useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
  height?: string;
}

/* Editor themes derived from the qryntiq tokens so the editor reads as part
   of the chrome. Syntax colors reuse the link and status hues only. */
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("qryntiq-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "", foreground: "171a21" },
      { token: "keyword", foreground: "245dd1", fontStyle: "bold" },
      { token: "keyword.sql", foreground: "245dd1", fontStyle: "bold" },
      { token: "operator.sql", foreground: "667085" },
      { token: "predefined.sql", foreground: "8e641d" },
      { token: "string", foreground: "267652" },
      { token: "string.sql", foreground: "267652" },
      { token: "number", foreground: "8e641d" },
      { token: "comment", foreground: "a8b0bd", fontStyle: "italic" },
      { token: "identifier", foreground: "171a21" },
      { token: "delimiter", foreground: "7d8696" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#171a21",
      "editor.lineHighlightBackground": "#f1f3f5",
      "editor.lineHighlightBorder": "#f1f3f5",
      "editorLineNumber.foreground": "#a8b0bd",
      "editorLineNumber.activeForeground": "#667085",
      "editor.selectionBackground": "#dbe6fd",
      "editor.inactiveSelectionBackground": "#e8ebf0",
      "editorCursor.foreground": "#171a21",
      "editorIndentGuide.background": "#e8ebf0",
      "editorIndentGuide.activeBackground": "#cfd5de",
      "editorBracketMatch.background": "#eaf0fe",
      "editorBracketMatch.border": "#c7d7fb",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#e0e4ea",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border": "#e0e4ea",
      "editorSuggestWidget.selectedBackground": "#eaf0fe",
      "scrollbarSlider.background": "#cfd5de80",
      "scrollbarSlider.hoverBackground": "#a8b0bd80",
      "scrollbar.shadow": "#00000000",
      focusBorder: "#00000000",
    },
  });

  monaco.editor.defineTheme("qryntiq-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "d5d9dd" },
      { token: "keyword", foreground: "83a9d3", fontStyle: "bold" },
      { token: "keyword.sql", foreground: "83a9d3", fontStyle: "bold" },
      { token: "operator.sql", foreground: "a0a5aa" },
      { token: "predefined.sql", foreground: "b4a0d1" },
      { token: "string", foreground: "a3be8c" },
      { token: "string.sql", foreground: "a3be8c" },
      { token: "number", foreground: "d5ad78" },
      { token: "comment", foreground: "777f87", fontStyle: "italic" },
      { token: "identifier", foreground: "d5d9dd" },
      { token: "delimiter", foreground: "a0a5aa" },
    ],
    colors: {
      "editor.background": "#171a1d",
      "editor.foreground": "#d5d9dd",
      "editor.lineHighlightBackground": "#22272b",
      "editor.lineHighlightBorder": "#22272b",
      "editorLineNumber.foreground": "#737d86",
      "editorLineNumber.activeForeground": "#a0a5aa",
      "editor.selectionBackground": "#3b4b5a",
      "editor.inactiveSelectionBackground": "#292e33",
      "editorCursor.foreground": "#dce2e7",
      "editorIndentGuide.background": "#292e33",
      "editorIndentGuide.activeBackground": "#30353a",
      "editorBracketMatch.background": "#29333d",
      "editorBracketMatch.border": "#465869",
      "editorWidget.background": "#22272b",
      "editorWidget.border": "#30353a",
      "editorSuggestWidget.background": "#22272b",
      "editorSuggestWidget.border": "#30353a",
      "editorSuggestWidget.selectedBackground": "#29333d",
      "scrollbarSlider.background": "#30353a80",
      "scrollbarSlider.hoverBackground": "#777f8780",
      "scrollbar.shadow": "#00000000",
      focusBorder: "#00000000",
    },
  });
};

export function SQLEditor({
  value,
  onChange,
  onRun,
  readOnly = false,
  height = "100%",
}: SQLEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Keep the latest onRun in a ref so the action registered at mount never
  // calls a stale closure.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    editor.addAction({
      id: "run-query",
      label: "Run Query",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => onRunRef.current?.(),
    });

    // Monaco measures glyph widths at mount; if the web font (JetBrains Mono)
    // loads a moment later, characters overlap or appear doubled. Remeasure
    // once fonts are ready, and relayout, to fix that.
    const remeasure = () => {
      try {
        monaco.editor.remeasureFonts();
        editor.layout();
      } catch {
        /* no-op */
      }
    };
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(remeasure);
      document.fonts.load('13px "JetBrains Mono"').then(remeasure).catch(() => {});
    }
    // One more pass on the next frame for good measure.
    requestAnimationFrame(remeasure);

    editor.focus();
  }, []);

  return (
    <Editor
      height={height}
      language="sql"
      theme={resolvedTheme === "dark" ? "qryntiq-dark" : "qryntiq-light"}
      value={value}
      onChange={(v) => onChange(v || "")}
      beforeMount={defineThemes}
      onMount={handleMount}
      loading={
        <div className="h-full w-full p-4">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="mt-2.5 h-3.5 w-1/3" />
          <Skeleton className="mt-2.5 h-3.5 w-2/5" />
        </div>
      }
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontLigatures: false,
        lineNumbers: "on",
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        tabSize: 2,
        wordWrap: "off",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        cursorBlinking: "solid",
        smoothScrolling: false,
        bracketPairColorization: { enabled: false },
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        suggest: { showKeywords: true, showSnippets: true },
        quickSuggestions: true,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
          useShadows: false,
        },
      }}
    />
  );
}
