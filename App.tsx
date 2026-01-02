import React, { useState, useRef, useEffect } from 'react';
import { AppState, FormData, ChatMessage } from './types';
import { FormStep } from './components/FormStep';
import { SelectionStep } from './components/SelectionStep';
import { ChatStep } from './components/ChatStep';
import { generateCharacterImages, editCharacterImage, fileToBase64 } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: 'form',
    isLoading: false,
    error: null,
    generatedImages: [],
    selectedImage: null,
    chatHistory: [],
    chatHistoryStack: [[]],
    currentHistoryIndex: 0,
  });
  
  // Ref for auto-scrolling to results
  const resultsRef = useRef<HTMLDivElement>(null);

  // Store form data to allow regeneration
  const [savedFormData, setSavedFormData] = useState<FormData | null>(null);

  useEffect(() => {
      // Auto-scroll to results if they exist and we are in form step
      if (state.step === 'form' && state.generatedImages.length > 0 && resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [state.generatedImages, state.step]);

  const handleFormSubmit = async (data: FormData) => {
    setSavedFormData(data);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const images = await generateCharacterImages(data);
      setState(prev => ({
        ...prev,
        isLoading: false,
        // Keep step as 'form' to show inline results
        step: 'form',
        generatedImages: images
      }));
    } catch (err: any) {
      // Robust error message extraction
      let errorMessage = "An unknown error occurred.";
      if (err instanceof Error) {
          errorMessage = err.message;
      } else if (typeof err === 'string') {
          errorMessage = err;
      } else {
          errorMessage = JSON.stringify(err);
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  };

  const handleRegenerate = async () => {
    if (!savedFormData) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const images = await generateCharacterImages(savedFormData);
      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: images
      }));
    } catch (err: any) {
      let errorMessage = "Regeneration failed.";
      if (err instanceof Error) errorMessage = err.message;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  };

  const handleSelectImage = (img: string) => {
    setState(prev => ({
      ...prev,
      step: 'chat',
      selectedImage: img,
      chatHistory: [], // Reset chat on new selection
      chatHistoryStack: [[]], // Reset stack
      currentHistoryIndex: 0
    }));
  };

  const handleChatMessage = async (msg: string) => {
    // 1. Optimistic update: Show user message immediately
    const newUserMsg: ChatMessage = { role: 'user', content: msg };
    
    // We calculate the new history based on the *current* visible history, not necessarily the stack
    // (though they should be synced unless we are mid-generation)
    const historyWithUser = [...state.chatHistory, newUserMsg];

    setState(prev => ({
      ...prev,
      isLoading: true,
      chatHistory: historyWithUser
    }));

    // Identify the latest valid image to use as base.
    // Logic: Start with selectedImage. If there are model messages with images, take the very last one.
    let lastImage = state.selectedImage;
    const modelMessages = historyWithUser.filter(m => m.role === 'model' && m.images && m.images.length > 0);
    
    if (modelMessages.length > 0) {
        const lastMsg = modelMessages[modelMessages.length - 1];
        if (lastMsg.images && lastMsg.images.length > 0) {
            lastImage = lastMsg.images[lastMsg.images.length - 1];
        }
    }

    if (!lastImage) {
        setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: "Tidak ada gambar referensi. Silakan mulai ulang." 
        }));
        return;
    }

    try {
        // Pass the original subject for ID consistency AND original form data for context
        const originalSubject = savedFormData?.subjectImageBase64 || null;

        const newImages = await editCharacterImage(
            lastImage, 
            msg, 
            originalSubject,
            savedFormData // Pass the entire saved form data for context
        );

        const newModelMsg: ChatMessage = {
            role: 'model',
            content: "Berikut hasilnya:",
            images: newImages
        };

        const finalHistory = [...historyWithUser, newModelMsg];

        // 2. Commit to Stack on Success
        setState(prev => {
            // Remove any "redo" history that might exist if we were back in time
            const cleanStack = prev.chatHistoryStack.slice(0, prev.currentHistoryIndex + 1);
            const newStack = [...cleanStack, finalHistory];
            
            return {
                ...prev,
                isLoading: false,
                chatHistory: finalHistory,
                chatHistoryStack: newStack,
                currentHistoryIndex: newStack.length - 1
            };
        });

    } catch (err: any) {
        let errorMessage = "Gagal mengedit gambar.";
        if (err instanceof Error) errorMessage = err.message;
        
        // Revert optimistic update (or keep it with error? Reverting is cleaner for the stack)
        // For now, we show the error but keep the user message so they can copy-paste/retry
        setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage
        }));
    }
  };

  const handleUndo = () => {
    if (state.isLoading || state.currentHistoryIndex <= 0) return;

    const newIndex = state.currentHistoryIndex - 1;
    setState(prev => ({
        ...prev,
        currentHistoryIndex: newIndex,
        chatHistory: prev.chatHistoryStack[newIndex]
    }));
  };

  const handleRedo = () => {
    if (state.isLoading || state.currentHistoryIndex >= state.chatHistoryStack.length - 1) return;

    const newIndex = state.currentHistoryIndex + 1;
    setState(prev => ({
        ...prev,
        currentHistoryIndex: newIndex,
        chatHistory: prev.chatHistoryStack[newIndex]
    }));
  };

  const handleBackToSelection = () => {
      setState(prev => ({
          ...prev,
          step: 'form', // Actually go back to form/selection view
          chatHistory: [],
          chatHistoryStack: [[]],
          currentHistoryIndex: 0,
          selectedImage: null
      }));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <div className="container mx-auto px-4 py-8">
        
        {state.error && (
          <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative animate-fade-in shadow-lg max-w-sm">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{state.error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setState(s => ({...s, error: null}))}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}

        {state.step === 'form' && (
          <>
            <FormStep 
                onSubmit={handleFormSubmit} 
                isGenerating={state.isLoading} 
                initialData={savedFormData}
            />
            
            <div ref={resultsRef}>
                {state.generatedImages.length > 0 && (
                <div className="mt-12">
                    <SelectionStep 
                        images={state.generatedImages} 
                        onSelect={handleSelectImage} 
                        onRegenerate={handleRegenerate}
                        isRegenerating={state.isLoading}
                    />
                </div>
                )}
            </div>
          </>
        )}

        {state.step === 'chat' && state.selectedImage && (
          <div className="fixed inset-0 bg-gray-50 z-40">
              <ChatStep 
                initialImage={state.selectedImage}
                history={state.chatHistory}
                onSend={handleChatMessage}
                isProcessing={state.isLoading}
                onBack={handleBackToSelection}
                canUndo={state.currentHistoryIndex > 0}
                canRedo={state.currentHistoryIndex < state.chatHistoryStack.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
          </div>
        )}

      </div>
    </div>
  );
};

export default App;