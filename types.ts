export enum CameraMode {
  MIRRORLESS = 'Mirrorless (Sharp, Detailed, Natural)',
  IPHONE = 'iPhone 15 (Amateur, High ISO, Smart HDR)',
}

export interface AppState {
  step: 'form' | 'selection' | 'chat';
  isLoading: boolean;
  error: string | null;
  generatedImages: string[]; // Base64 strings
  selectedImage: string | null;
  chatHistory: ChatMessage[]; // Current visible history
  chatHistoryStack: ChatMessage[][]; // Stack of history snapshots for Undo/Redo
  currentHistoryIndex: number; // Current position in the stack
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  images?: string[];
}

export interface FormData {
  subjectImage: File | null;
  subjectImageBase64?: string; // Persisted data
  locationImage: File | null;
  locationImageBase64?: string; // Persisted data
  locationText: string;
  outfitImage: File | null;
  outfitImageBase64?: string; // Persisted data
  outfitText: string;
  bodyDetails: string;
  prompt: string;
  cameraMode: CameraMode;
  imageCount: number;
  aspectRatio: '3:4' | '9:16';
}