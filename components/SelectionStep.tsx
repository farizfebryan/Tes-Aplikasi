import React from 'react';

interface SelectionStepProps {
  images: string[];
  onSelect: (image: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export const SelectionStep: React.FC<SelectionStepProps> = ({ images, onSelect, onRegenerate, isRegenerating }) => {
  
  const handleDownload = (e: React.MouseEvent, base64: string, index: number) => {
    e.stopPropagation(); // Prevent card selection
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = `realid-gen-${Date.now()}-${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 animate-fade-in">
      <h2 className="text-xl font-bold text-center text-gray-800 mb-2">Pilih Hasil Terbaik</h2>
      <p className="text-center text-gray-500 mb-8 text-sm">Klik pada foto yang paling sesuai untuk melanjutkan ke mode chat.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {images.map((img, idx) => (
          <div 
            key={idx} 
            className="group relative cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 bg-white"
            onClick={() => onSelect(img)}
          >
            <img 
              src={`data:image/png;base64,${img}`} 
              alt={`Generated option ${idx + 1}`} 
              className="w-full h-auto object-cover"
            />
            
            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex flex-col items-center justify-center gap-2">
                <span className="opacity-0 group-hover:opacity-100 bg-white text-black px-4 py-2 rounded-full font-medium text-sm transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg">
                    Edit Foto Ini →
                </span>
            </div>

            {/* Always visible download button on mobile, hover on desktop */}
            <button
                onClick={(e) => handleDownload(e, img, idx)}
                className="absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-md hover:bg-white text-gray-700 hover:text-black z-10 transition-all"
                title="Download Image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="text-zinc-600 underline text-sm hover:text-black disabled:opacity-50"
        >
          {isRegenerating ? "Sedang membuat ulang..." : "Tidak cocok keduanya? Generate Ulang"}
        </button>
      </div>
    </div>
  );
};
