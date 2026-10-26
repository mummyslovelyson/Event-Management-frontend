import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, X, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadTicketFiles } from '@/api/tickets';
import { getMediaUrl } from '@/utils/media';

/**
 * TicketFilesUploader Component
 * Allows organizers to upload pre-generated ticket files (PDF, PNG, JPG, WebP)
 * for a ticket tier. Auto-calculates quantity and displays uploaded passes.
 */
export default function TicketFilesUploader({
  files = [],
  onChange,
  disabled = false,
  label = 'Upload Pre-Generated Ticket Passes (PDF / Images)',
}) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;

    // Filter valid files
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const selectedFiles = Array.from(fileList);
    const validFiles = selectedFiles.filter((f) => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      return validExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      toast.error('Please upload PDF, PNG, JPG, or WebP files only.');
      return;
    }

    if (validFiles.length < selectedFiles.length) {
      toast.error('Some files were ignored because they are not PDF or images.');
    }

    // Check size limit: 15MB each
    const overSized = validFiles.find((f) => f.size > 15 * 1024 * 1024);
    if (overSized) {
      toast.error(`File "${overSized.name}" exceeds 15MB limit.`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    for (const file of validFiles) {
      formData.append('files', file);
    }

    try {
      const res = await uploadTicketFiles(formData);
      const uploadedData = res.data?.files || [];
      const newItems = uploadedData.map((item) => ({
        file_url: item.file_url || item.url,
        file_name: item.file_name || item.originalName || 'ticket-pass',
        size: item.size,
        mimetype: item.mimetype,
      }));

      const updated = [...(files || []), ...newItems];
      if (onChange) {
        onChange(updated);
      }
      toast.success(`Successfully uploaded ${newItems.length} ticket ${newItems.length === 1 ? 'file' : 'files'}!`);
    } catch (err) {
      console.error('[TicketFilesUploader] Upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload ticket files. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove) => {
    const updated = files.filter((_, idx) => idx !== indexToRemove);
    if (onChange) {
      onChange(updated);
    }
  };

  const clearAll = () => {
    if (onChange) {
      onChange([]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-neutral-400" />
          {label}
        </label>
        {files.length > 0 && (
          <span className="text-xs font-medium text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
            {files.length} {files.length === 1 ? 'ticket pass' : 'ticket passes'} loaded
          </span>
        )}
      </div>

      {/* Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-white bg-white/10'
            : 'border-white/[0.12] hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04]'
        } ${disabled || uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
            <p className="text-sm font-medium text-white">Uploading ticket files...</p>
            <p className="text-xs text-neutral-400">Storing tickets in your inventory</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-1 space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white">
              <Upload className="w-5 h-5 text-neutral-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Click to browse or drag &amp; drop ticket files
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Upload batch pre-generated PDF passes, barcode tickets, or images (.png, .jpg, .webp, .pdf up to 15MB each)
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400 font-medium">
              <span>Quantity automatically syncs to files • Images will preview below</span>
            </div>
          </div>
        )}
      </div>

      {/* Files List & Management */}
      {files.length > 0 && (
        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-3 space-y-2">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-white/[0.06]">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Uploaded Passes Inventory ({files.length})
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-red-400 hover:text-red-300 hover:underline transition font-medium cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-white/[0.06]">
            {files.map((file, idx) => {
              const name = file.file_name || file.name || `Ticket Pass #${idx + 1}`;
              const isPdf = name.toLowerCase().endsWith('.pdf') || (file.mimetype && file.mimetype.includes('pdf'));
              const fileUrl = getMediaUrl(file.file_url || file.url);
              return (
                <div
                  key={idx}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-neutral-400 shrink-0">
                      {idx + 1}
                    </span>
                    {!isPdf && fileUrl ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/[0.04] flex items-center justify-center">
                        <img
                          src={fileUrl}
                          alt={name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                            if (sibling) sibling.classList.remove('hidden');
                          }}
                        />
                        <span className="fallback-icon hidden text-[9px] font-bold text-neutral-400 uppercase">IMG</span>
                      </div>
                    ) : (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          isPdf ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {isPdf ? 'PDF' : 'IMG'}
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className="font-medium text-white truncate block max-w-[200px] sm:max-w-xs" title={name}>
                        {name}
                      </span>
                      {file.size && (
                        <span className="text-[10px] text-neutral-400">({formatFileSize(file.size)})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-white font-medium transition"
                      >
                        Preview
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Remove ticket file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#262B2F] flex items-center gap-2 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              Each attendee who completes an order will be automatically assigned their unique ticket file.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
