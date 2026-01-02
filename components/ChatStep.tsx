import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatStepProps {
  initialImage: string;
  history: ChatMessage[];
  onSend: (message: string) => void;
  isProcessing: boolean;
  onBack: () => void;
  // Undo/Redo Props
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const ChatStep: React.FC<ChatStepProps> = ({ 
    initialImage, 
    history, 
    onSend, 
    isProcessing, 
    onBack,
    canUndo,
    canRedo,
    onUndo,
    onRedo
}) => {
  const [input, setInput] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSend(input);
    setInput('');
  };

  const handleDownload = (base64: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = `realid-edit-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleQuickAction = (template: string) => {
      setInput(template);
      inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-xl overflow-hidden relative">
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
           <div className="relative max-w-4xl max-h-screen w-full flex flex-col items-center justify-center h-full">
              <img 
                src={`data:image/png;base64,${previewImage}`} 
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()} 
                alt="Preview"
              />
              <div className="flex gap-4 mt-6" onClick={(e) => e.stopPropagation()}>
                 <button 
                    onClick={() => handleDownload(previewImage)}
                    className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                 </button>
                 <button 
                    onClick={() => setPreviewImage(null)}
                    className="bg-zinc-800 text-white px-6 py-2 rounded-full font-bold hover:bg-zinc-700 transition-colors"
                 >
                    Tutup
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-zinc-900 text-white p-4 flex items-center justify-between shadow-md z-10">
         <div className="flex items-center gap-4">
             <button 
                onClick={onBack}
                className="flex items-center text-sm hover:text-gray-300 transition-colors"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Kembali
             </button>
         </div>

         <div className="flex items-center gap-2">
             <button
                onClick={onUndo}
                disabled={!canUndo || isProcessing}
                className="p-2 rounded-full hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Undo (Ctrl+Z)"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                 </svg>
             </button>
             <button
                onClick={onRedo}
                disabled={!canRedo || isProcessing}
                className="p-2 rounded-full hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Redo (Ctrl+Y)"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                 </svg>
             </button>
         </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50" ref={scrollRef}>
        
        {/* Initial Context Message */}
        <div className="flex justify-start">
            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                <p className="text-sm text-gray-600 mb-3">Foto Awal:</p>
                <div className="relative rounded-lg overflow-hidden border border-gray-100 group">
                    <img 
                        src={`data:image/png;base64,${initialImage}`} 
                        alt="Initial Context" 
                        className="w-full h-auto cursor-pointer"
                        onClick={() => setPreviewImage(initialImage)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all pointer-events-none" />
                    <button 
                        onClick={() => setPreviewImage(initialImage)}
                        className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                        title="Preview"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        {/* Dynamic History */}
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
                className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                    ? 'bg-zinc-800 text-white rounded-tr-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                }`}
            >
              {msg.content && <p className="mb-2 whitespace-pre-wrap">{msg.content}</p>}
              
              {msg.images && msg.images.length > 0 && (
                  <div className={`grid gap-3 mt-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {msg.images.map((img, i) => (
                          <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-100 bg-gray-100">
                              <img 
                                src={`data:image/png;base64,${img}`} 
                                alt="Generated result" 
                                className="w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => setPreviewImage(img)}
                              />
                              
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all pointer-events-none" />

                              <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => setPreviewImage(img)}
                                    className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm shadow-sm"
                                    title="Preview"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={() => handleDownload(img)}
                                    className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm shadow-sm"
                                    title="Download"
                                    >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
           <div className="flex justify-start">
             <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                <span className="text-gray-400 text-xs ml-2">Sedang memproses...</span>
             </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => handleQuickAction('Ubah sudut pandang kamera menjadi...')} className="px-3 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">Ubah Sudut Pandang</button>
            <button onClick={() => handleQuickAction('Ubah ekspresinya menjadi...')} className="px-3 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">Ganti Ekspresi</button>
            <button onClick={() => handleQuickAction('Perbaiki bagian pakaian...')} className="px-3 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">Koreksi Pakaian</button>
            <button onClick={() => handleQuickAction('Sesuaikan pencahayaan agar...')} className="px-3 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">Sesuaikan Cahaya</button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik instruksi (e.g., 'Buat 2 foto dia sedang tertawa')..."
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-800 transition-all resize-none min-h-[50px] max-h-[120px] text-gray-900 bg-white placeholder-gray-500"
            rows={1}
            disabled={isProcessing}
            onKeyDown={(e) => {
                // Submit only on Ctrl+Enter, otherwise regular Enter adds newline
                if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmit(e);
                }
            }}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="bg-zinc-900 text-white p-3 rounded-xl hover:bg-black disabled:opacity-50 transition-colors h-[50px] w-[50px] flex items-center justify-center flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
        <div className="text-xs text-center text-gray-400 mt-2">Tekan Ctrl + Enter untuk mengirim, Enter untuk baris baru</div>
      </div>
    </div>
  );
};