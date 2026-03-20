"use client";

import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
  FileTreeIcon,
  FileTreeName,
  FileTreeActions,
} from "@/components/ai-elements/file-tree";
import { cn } from "@/lib/utils";
import { type TreeNode } from "@/lib/use-sandbox";
// (preview helpers live in file-preview-panel.tsx)
import {
  FileIcon,
  FileTextIcon,
  FileCodeIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileArchiveIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileImageIcon,
  FileTerminalIcon,
  FolderOpenIcon,
  XIcon,
  RefreshCwIcon,
  UploadIcon,
  LoaderIcon,
  DownloadIcon,
  ArchiveIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iconForFile(name: string): ReactNode {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const codeExts = [
    "py", "ts", "tsx", "js", "jsx", "rs", "go", "java", "c", "cpp", "h",
    "rb", "css", "scss", "html", "xml", "yaml", "yml", "toml", "graphql", "sql",
  ];
  const shellExts = ["sh", "bash", "zsh", "fish", "ps1", "cmd", "bat"];
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "tiff", "heic"];
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "m4a", "aac", "opus", "wma"];
  const archiveExts = ["zip", "tar", "gz", "bz2", "xz", "7z", "rar", "tgz"];
  const spreadsheetExts = ["csv", "xlsx", "xls", "ods", "tsv"];
  const docExts = ["doc", "docx", "odt", "rtf"];

  if (ext === "json" || ext === "jsonl")
    return <FileJsonIcon className="size-4 text-amber-600" />;
  if (ext === "pdf")
    return <FileTextIcon className="size-4 text-red-500" />;
  if (ext === "tex" || ext === "latex" || ext === "bib")
    return <FileCodeIcon className="size-4 text-teal-500" />;
  if (codeExts.includes(ext))
    return <FileCodeIcon className="size-4 text-violet-500" />;
  if (shellExts.includes(ext))
    return <FileTerminalIcon className="size-4 text-slate-500" />;
  if (imageExts.includes(ext))
    return <FileImageIcon className="size-4 text-rose-500" />;
  if (videoExts.includes(ext))
    return <FileVideoIcon className="size-4 text-blue-500" />;
  if (audioExts.includes(ext))
    return <FileAudioIcon className="size-4 text-purple-500" />;
  if (archiveExts.includes(ext))
    return <FileArchiveIcon className="size-4 text-orange-500" />;
  if (spreadsheetExts.includes(ext))
    return <FileSpreadsheetIcon className="size-4 text-emerald-600" />;
  if (["md", "mdx", "txt", "log", "rst"].includes(ext))
    return <FileTextIcon className="size-4 text-emerald-600" />;
  if (docExts.includes(ext))
    return <FileTextIcon className="size-4 text-blue-600" />;
  return <FileIcon className="size-4 text-muted-foreground" />;
}

// ---------------------------------------------------------------------------
// Tree renderer
// ---------------------------------------------------------------------------

function TreeNodes({
  nodes,
  onSelect,
  onDownload,
  onDelete,
  onDownloadDir,
  onDeleteDir,
  selectedPath,
}: {
  nodes: TreeNode[];
  onSelect: (path: string) => void;
  onDownload: (path: string) => void;
  onDelete: (path: string) => void;
  onDownloadDir: (path: string) => void;
  onDeleteDir: (path: string) => void;
  selectedPath: string | null;
}) {
  return (
    <>
      {nodes.map((node) =>
        node.type === "directory" ? (
          <FileTreeFolder
            key={node.path}
            path={node.path}
            name={node.name}
            actions={
              <FileTreeActions>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onDownloadDir(node.path); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onDownloadDir(node.path); } }}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/folder:opacity-100 cursor-pointer"
                  title={`Download ${node.name} as zip`}
                >
                  <DownloadIcon className="size-3" />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onDeleteDir(node.path); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onDeleteDir(node.path); } }}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/folder:opacity-100 cursor-pointer"
                  title={`Delete ${node.name}`}
                >
                  <Trash2Icon className="size-3" />
                </div>
              </FileTreeActions>
            }
          >
            {node.children && node.children.length > 0 && (
              <TreeNodes
                nodes={node.children}
                onSelect={onSelect}
                onDownload={onDownload}
                onDelete={onDelete}
                onDownloadDir={onDownloadDir}
                onDeleteDir={onDeleteDir}
                selectedPath={selectedPath}
              />
            )}
          </FileTreeFolder>
        ) : (
          <FileTreeFile
            key={node.path}
            path={node.path}
            name={node.name}
            className="group/file"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-kady-filepath", node.path);
              e.dataTransfer.effectAllowed = "copy";
              const ghost = document.createElement("div");
              ghost.textContent = node.name;
              ghost.style.cssText =
                "position:absolute;top:-1000px;background:#6366f1;color:white;padding:3px 8px;border-radius:4px;font-size:11px;font-family:monospace;box-shadow:0 2px 8px rgba(0,0,0,0.2)";
              document.body.appendChild(ghost);
              e.dataTransfer.setDragImage(ghost, 0, 0);
              setTimeout(() => ghost.remove(), 0);
            }}
          >
            <span className="size-4" />
            <FileTreeIcon>{iconForFile(node.name)}</FileTreeIcon>
            <FileTreeName>{node.name}</FileTreeName>
            <FileTreeActions>
              <button
                onClick={() => onDownload(node.path)}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/file:opacity-100"
                title={`Download ${node.name}`}
              >
                <DownloadIcon className="size-3" />
              </button>
              <button
                onClick={() => onDelete(node.path)}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/file:opacity-100"
                title={`Delete ${node.name}`}
              >
                <Trash2Icon className="size-3" />
              </button>
            </FileTreeActions>
          </FileTreeFile>
        )
      )}
    </>
  );
}

function countFiles(node: TreeNode): number {
  if (node.type === "file") return 1;
  return (node.children ?? []).reduce((sum, c) => sum + countFiles(c), 0);
}

// ---------------------------------------------------------------------------
// FileTreePanel — left sidebar
// ---------------------------------------------------------------------------

interface FileTreePanelProps {
  tree: TreeNode | null;
  selectedPath: string | null;
  uploading: boolean;
  onSelect: (path: string) => void;
  onDownload: (path: string) => void;
  onDelete: (path: string) => void;
  onDownloadDir: (path: string) => void;
  onDeleteDir: (path: string) => void;
  onDownloadAll: () => void;
  onRefresh: () => void;
  onClose: () => void;
  onUpload: (files: FileList | File[]) => void;
  onOrganize?: () => void;
}

export function FileTreePanel({
  tree,
  selectedPath,
  uploading,
  onSelect,
  onDownload,
  onDelete,
  onDownloadDir,
  onDeleteDir,
  onDownloadAll,
  onRefresh,
  onClose,
  onUpload,
  onOrganize,
}: FileTreePanelProps) {
  const totalFiles = useMemo(() => (tree ? countFiles(tree) : 0), [tree]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OS file drag-and-drop
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const hasOsFiles = useCallback((e: React.DragEvent) => {
    return e.dataTransfer.types.includes("Files") && !e.dataTransfer.types.includes("application/x-kady-filepath");
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!hasOsFiles(e)) return;
    e.preventDefault();
    dragCounter.current++;
    setIsDragOver(true);
  }, [hasOsFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!hasOsFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, [hasOsFiles]);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }, [onUpload]);

  const allDirPaths = useMemo(() => {
    const dirs = new Set<string>();
    function collect(node: TreeNode) {
      if (node.type === "directory") {
        dirs.add(node.path);
        for (const child of node.children ?? []) collect(child);
      }
    }
    if (tree) collect(tree);
    return dirs;
  }, [tree]);

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([""]));
  const seenDirPaths = useRef<Set<string>>(new Set([""]));
  useEffect(() => {
    const unseen = [...allDirPaths].filter((p) => !seenDirPaths.current.has(p));
    if (unseen.length === 0) return;
    for (const p of unseen) seenDirPaths.current.add(p);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      for (const p of unseen) next.add(p);
      return next;
    });
  }, [allDirPaths]);

  const handleSelect = useCallback(
    (path: string) => { if (!allDirPaths.has(path)) onSelect(path); },
    [allDirPaths, onSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onUpload(e.target.files);
        e.target.value = "";
      }
    },
    [onUpload]
  );

  return (
    <div
      className="relative flex h-full flex-col border-r"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary rounded-md">
          <div className="flex flex-col items-center gap-1.5">
            <UploadIcon className="size-5 text-primary" />
            <span className="text-xs font-medium text-primary">Drop files to upload</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <FolderOpenIcon className="size-4 text-blue-500" />
          <span className="font-semibold text-sm">Sandbox</span>
          {totalFiles > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 tabular-nums">
              {totalFiles}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          {totalFiles > 0 && onOrganize && (
            <button onClick={onOrganize} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Auto-organize files">
              <WandSparklesIcon className="size-3.5" />
            </button>
          )}
          {totalFiles > 0 && (
            <button onClick={onDownloadAll} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Download all as zip">
              <ArchiveIcon className="size-3.5" />
            </button>
          )}
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50" title="Upload files">
            {uploading ? <LoaderIcon className="size-3.5 animate-spin" /> : <UploadIcon className="size-3.5" />}
          </button>
          <button onClick={onRefresh} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Refresh">
            <RefreshCwIcon className="size-3.5" />
          </button>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Close">
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {!tree || (tree.children ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted/60">
              <FolderOpenIcon className="size-5 text-muted-foreground/50" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">No files yet</p>
              <p className="text-[11px] text-muted-foreground/60">Drop files here or use the upload button</p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            <FileTree
              onSelect={handleSelect}
              selectedPath={selectedPath ?? undefined}
              expanded={expandedPaths}
              onExpandedChange={setExpandedPaths}
              className="border-none bg-transparent"
            >
              <TreeNodes
                nodes={tree.children ?? []}
                onSelect={handleSelect}
                onDownload={onDownload}
                onDelete={onDelete}
                onDownloadDir={onDownloadDir}
                onDeleteDir={onDeleteDir}
                selectedPath={selectedPath}
              />
            </FileTree>
          </div>
        )}
      </div>
    </div>
  );
}

