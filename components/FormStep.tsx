import React, { useState } from 'react';
import { CameraMode, FormData } from '../types';
import { FileUpload } from './FileUpload';
import { fileToBase64 } from '../services/geminiService';

interface FormStepProps {
  onSubmit: (data: FormData) => void;
  isGenerating: boolean;
  initialData?: FormData | null;
}

export const FormStep: React.FC<FormStepProps> = ({ onSubmit, isGenerating, initialData }) => {
  const [formData, setFormData] = useState<FormData>(() => {
      if (initialData) {
          return initialData;
      }
      return {
        subjectImage: null,
        locationImage: null,
        locationText: '',
        outfitImage: null,
        outfitText: '',
        bodyDetails: '',
        prompt: '',
        cameraMode: CameraMode.MIRRORLESS,
        imageCount: 2,
        aspectRatio: '3:4',
      };
  });

  // Helper to handle file selection and immediate conversion to Base64
  const handleImageChange = async (field: 'subjectImage' | 'locationImage' | 'outfitImage', file: File | null) => {
      if (file) {
          try {
              const base64 = await fileToBase64(file);
              setFormData(prev => ({
                  ...prev,
                  [field]: file,
                  [`${field}Base64`]: base64 // Save the string version immediately
              }));
          } catch (e) {
              console.error("Failed to convert file immediately:", e);
              // Fallback to just storing the file
              setFormData(prev => ({ ...prev, [field]: file }));
          }
      } else {
          // Clear both file and base64 if removed
          setFormData(prev => ({
              ...prev,
              [field]: null,
              [`${field}Base64`]: undefined
          }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectImage && !formData.subjectImageBase64) {
      alert("Subject image is required!");
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 tracking-tight">RealID Creator</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Subject */}
        <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Subjek Utama</h2>
            <FileUpload 
                label="Upload Foto Wajah/Subjek" 
                subLabel="Pastikan wajah terlihat jelas."
                required 
                initialFile={formData.subjectImage}
                initialPreview={formData.subjectImageBase64}
                onChange={(f) => handleImageChange('subjectImage', f)} 
            />
        </div>

        {/* 2. Location */}
        <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">2. Lokasi & Ambience</h2>
            <FileUpload 
                label="Foto Lokasi (Opsional)" 
                initialFile={formData.locationImage}
                initialPreview={formData.locationImageBase64}
                onChange={(f) => handleImageChange('locationImage', f)} 
            />
            <textarea
                placeholder="Deskripsi lokasi (Contoh: Cafe malam hari, lampu neon redup...)"
                className="mt-2 w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 text-gray-900 bg-white placeholder-gray-500"
                rows={2}
                value={formData.locationText}
                onChange={(e) => setFormData(prev => ({ ...prev, locationText: e.target.value }))}
            />
        </div>

        {/* 3. Outfit */}
        <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">3. Referensi Outfit</h2>
            <FileUpload 
                label="Foto Outfit (Opsional)" 
                subLabel="Boleh ketik manual."
                initialFile={formData.outfitImage}
                initialPreview={formData.outfitImageBase64}
                onChange={(f) => handleImageChange('outfitImage', f)} 
            />
            <textarea
                placeholder="Deskripsi outfit (Contoh: Kaos putih oversize, celana jeans belel...)"
                className="mt-2 w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 text-gray-900 bg-white placeholder-gray-500"
                rows={2}
                value={formData.outfitText}
                onChange={(e) => setFormData(prev => ({ ...prev, outfitText: e.target.value }))}
            />
        </div>

        {/* 4. Body Detail */}
        <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">4. Detail Fisik</h2>
            <textarea
                placeholder="Deskripsikan detail tubuh senatural mungkin (Contoh: Curvy, kulit bertekstur, dll)..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 text-gray-900 bg-white placeholder-gray-500"
                rows={3}
                value={formData.bodyDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, bodyDetails: e.target.value }))}
            />
        </div>

        {/* 5. Additional Prompt */}
        <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">5. Instruksi Tambahan (Scene/Pose)</h2>
            <textarea
                placeholder="Atau hal lain yang mau ditambahkan"
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 text-gray-900 bg-white placeholder-gray-500"
                rows={3}
                value={formData.prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
            />
        </div>

        {/* 6. Camera Mode */}
        <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">6. Mode Kamera</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cameraMode: CameraMode.MIRRORLESS }))}
                    className={`p-3 rounded-lg text-sm border text-left transition-all ${
                        formData.cameraMode === CameraMode.MIRRORLESS 
                        ? 'border-zinc-800 bg-zinc-800 text-white' 
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                >
                    <div className="font-bold">Mirrorless</div>
                </button>
                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cameraMode: CameraMode.IPHONE }))}
                    className={`p-3 rounded-lg text-sm border text-left transition-all ${
                        formData.cameraMode === CameraMode.IPHONE 
                        ? 'border-zinc-800 bg-zinc-800 text-white' 
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                >
                    <div className="font-bold">Smart Phone</div>
                </button>
            </div>
        </div>

        {/* 7. Aspect Ratio */}
        <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">7. Rasio Gambar</h2>
            <div className="grid grid-cols-2 gap-3">
                {(['3:4', '9:16'] as const).map((ratio) => (
                    <button
                        key={ratio}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, aspectRatio: ratio }))}
                        className={`p-3 rounded-lg font-medium border transition-all ${
                            formData.aspectRatio === ratio
                            ? 'bg-zinc-800 text-white border-zinc-800'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        {ratio}
                    </button>
                ))}
            </div>
        </div>

        {/* 8. Image Count */}
        <div className="pb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">8. Jumlah Gambar</h2>
            <div className="flex gap-3">
                {[1, 2, 3, 4].map((count) => (
                    <button
                        key={count}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageCount: count }))}
                        className={`flex-1 py-3 rounded-lg font-medium border transition-all ${
                            formData.imageCount === count
                            ? 'bg-zinc-800 text-white border-zinc-800'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        {count}
                    </button>
                ))}
            </div>
        </div>

        <button
            type="submit"
            disabled={isGenerating}
            className="w-full bg-zinc-900 text-white py-4 rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg"
        >
            {isGenerating ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                </>
            ) : "Generate Images"}
        </button>
      </form>
    </div>
  );
};