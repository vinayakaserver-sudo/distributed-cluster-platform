'use client';
import { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Trash2, Download, Copy, Check, ExternalLink, HardDrive } from 'lucide-react';
import { StorageFile } from '@/types';
import { formatBytes, formatDate } from '@/lib/utils';
import { vkcloud } from '@/lib/vkcloud';
import { toast } from 'sonner';

interface FileExplorerProps {
  files: StorageFile[];
  onRefresh: () => void;
}

export function FileExplorer({ files, onRefresh }: FileExplorerProps) {
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        await vkcloud.uploadFile(fileList[i]);
      }
      toast.success('Files uploaded successfully');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await vkcloud.deleteFile(fileId);
      toast.success('File deleted');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleCopyLink = (fileId: string) => {
    const url = vkcloud.getFileDownloadUrl(fileId);
    navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    toast.success('Download URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-card/40 p-8 text-center transition-all hover:border-blue-500/60 hover:bg-blue-500/5"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          multiple
          className="hidden"
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform mb-3">
          <Upload className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-white">
          {uploading ? 'Uploading to cloud...' : 'Click to upload or drag and drop'}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          SVG, PNG, JPG, PDF, or documents up to 50MB (Stored permanently in Neon)
        </p>
      </div>

      {/* Files Grid / List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Uploaded Objects ({files.length})</h3>
          <span className="text-xs text-muted-foreground">Provider: <strong className="text-blue-400">Neon PostgreSQL BYTEA</strong></span>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/30 p-12 text-center">
            <HardDrive className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No files uploaded yet in this storage bucket.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => {
              const isImage = file.filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
              const downloadUrl = vkcloud.getFileDownloadUrl(file.file_id);

              return (
                <div
                  key={file.file_id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80 hover:shadow-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      {isImage ? <ImageIcon className="h-5 w-5 text-blue-400" /> : <FileText className="h-5 w-5 text-emerald-400" />}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm font-semibold text-white" title={file.filename}>
                        {file.filename}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(file.size)} • {formatDate(file.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end space-x-2 border-t border-border/60 pt-3">
                    <button
                      onClick={() => handleCopyLink(file.file_id)}
                      title="Copy Public URL"
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-white"
                    >
                      {copiedId === file.file_id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Preview / Download"
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(file.file_id)}
                      title="Delete File"
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
