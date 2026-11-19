"use client";

import { useRef, useCallback, useEffect, useState } from "react";
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

const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/* Editor themes derived from the qryntiq tokens so the editor reads as part
   of the chrome. Syntax colors reuse the link and status hues only. */
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("qryntiq-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "", foreground: "1b1b1d" },
      { token: "keyword", foreground: "2f5d8a", fontStyle: "" },
      { token: "keyword.sql", foreground: "2f5d8a", fontStyle: "" },
      { token: "operator.sql", foreground: "75757b" },
      { token: "predefined.sql", foreground: "84508a" },
      { token: "string", foreground: "2c7650" },
      { token: "string.sql", foreground: "2c7650" },
      { token: "number", foreground: "96661a" },
      { token: "comment", foreground: "a5a39d", fontStyle: "italic" },
      { token: "identifier", foreground: "1b1b1d" },
      { token: "delimiter", foreground: "75757b" },
    ],
    colors: {
      "editor.background": "#fffefc",
      "editor.foreground": "#1b1b1d",
      "editor.lineHighlightBackground": "#f6f4ef",
      "editor.lineHighlightBorder": "#f6f4ef",
      "editorLineNumber.foreground": "#bdbab3",
      "editorLineNumber.activeForeground": "#57575e",
      "editor.selectionBackground": "#d5e0eb",
      "editor.inactiveSelectionBackground": "#e9e6df",
      "editorCursor.foreground": "#2c4c6e",
      "editorIndentGuide.background": "#ece9e2",
      "editorIndentGuide.activeBackground": "#d2cec4",
      "editorBracketMatch.background": "#e9eef3",
      "editorBracketMatch.border": "#c6d3e0",
      "editorWidget.background": "#fffefc",
      "editorWidget.border": "#e4e1d9",
      "editorSuggestWidget.background": "#fffefc",
      "editorSuggestWidget.border": "#e4e1d9",
      "editorSuggestWidget.selectedBackground": "#e9eef3",
      "scrollbarSlider.background": "#d2cec480",
      "scrollbarSlider.hoverBackground": "#a5a39d80",
      "scrollbar.shadow": "#00000000",
      focusBorder: "#00000000",
    },
  });

  monaco.editor.defineTheme("qryntiq-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "dedcd6" },
      { token: "keyword", foreground: "9fbad4", fontStyle: "" },
      { token: "keyword.sql", foreground: "9fbad4", fontStyle: "" },
      { token: "operator.sql", foreground: "8d8b86" },
      { token: "predefined.sql", foreground: "c7abd6" },
      { token: "string", foreground: "9cc3a5" },
      { token: "string.sql", foreground: "9cc3a5" },
      { token: "number", foreground: "d7b06e" },
      { token: "comment", foreground: "65646a", fontStyle: "italic" },
      { token: "identifier", foreground: "dedcd6" },
      { token: "delimiter", foreground: "8d8b86" },
    ],
    colors: {
      "editor.background": "#131518",
      "editor.foreground": "#dedcd6",
      "editor.lineHighlightBackground": "#1a1d21",
      "editor.lineHighlightBorder": "#1a1d21",
      "editorLineNumber.foreground": "#4b4e54",
      "editorLineNumber.activeForeground": "#aeaca6",
      "editor.selectionBackground": "#2b3c4f",
      "editor.inactiveSelectionBackground": "#22262b",
      "editorCursor.foreground": "#b3c7da",
      "editorIndentGuide.background": "#1f2226",
      "editorIndentGuide.activeBackground": "#363b42",
      "editorBracketMatch.background": "#1a232d",
      "editorBracketMatch.border": "#2d3d4e",
      "editorWidget.background": "#1c1f23",
      "editorWidget.border": "#363b42",
      "editorSuggestWidget.background": "#1c1f23",
      "editorSuggestWidget.border": "#363b42",
      "editorSuggestWidget.selectedBackground": "#1a232d",
      "scrollbarSlider.background": "#363b4280",
      "scrollbarSlider.hoverBackground": "#65646a80",
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
  const [fontFamily, setFontFamily] = useState(MONO_FALLBACK);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  // Glyph widths are cached per family: remeasure after the real font applies.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        monacoRef.current?.editor.remeasureFonts();
        editorRef.current?.layout();
      } catch {
        /* no-op */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [fontFamily]);

  // Keep the latest onRun in a ref so the action registered at mount never
  // calls a stale closure.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addAction({
      id: "run-query",
      label: "Run Query",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => onRunRef.current?.(),
    });

    // Use the self-hosted Plex Mono (next/font exposes its hashed family name
    // through a CSS variable).
    const family =
      typeof document !== "undefined"
        ? getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim()
        : "";
    if (family) setFontFamily(`${family}, ${MONO_FALLBACK}`);

    // Monaco measures glyph widths at mount; if the web font loads a moment
    // later, characters overlap or appear doubled. Remeasure once fonts are
    // ready, and relayout, to fix that.
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
      if (family) document.fonts.load(`13px ${family}`).then(remeasure).catch(() => {});
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
        fontSize: 13.5,
        lineHeight: 22,
        fontFamily,
        fontLigatures: false,
        lineNumbers: "on",
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        tabSize: 2,
        wordWrap: "off",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        cursorWidth: 2,
        smoothScrolling: true,
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
