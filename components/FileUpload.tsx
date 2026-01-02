import React, { useState, useEffect } from 'react';

interface FileUploadProps {
  label: string;
  subLabel?: string;
  accept?: string;
  onChange: (file: File | null) => void;
  required?: boolean;
  initialFile?: File | null;
  initialPreview?: string; // New prop to force show a preview (Base64)
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, subLabel, accept = "image/*", onChange, required, initialFile, initialPreview }) => {
  const [preview, setPreview] = useState<string | null>(null);

  // Sync initial state
  useEffect(() => {
    if (initialPreview) {
        // If we have a saved base64 string, use it directly. It's stable.
        setPreview(`data:image/jpeg;base64,${initialPreview}`);
    } else if (initialFile) {
      // Fallback to blob URL if only file is provided (less stable across navigation)
      const objectUrl = URL.createObjectURL(initialFile);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreview(null);
    }
  }, [initialFile, initialPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onChange(file);
    } else {
      setPreview(null);
      onChange(null);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {subLabel && <p className="text-xs text-gray-500 mb-2">{subLabel}</p>}
      
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-zinc-100 file:text-zinc-700
            hover:file:bg-zinc-200
            cursor-pointer border border-gray-300 rounded-lg p-2"
        />
      </div>

      {preview && (
        <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => {
                setPreview(null);
                onChange(null);
                const inputs = document.querySelectorAll('input[type="file"]');
                inputs.forEach(i => (i as HTMLInputElement).value = '');
            }}
            className="absolute top-0 right-0 bg-red-500 text-white text-xs p-1 rounded-bl opacity-80 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};