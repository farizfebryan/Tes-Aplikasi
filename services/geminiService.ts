import { GoogleGenAI } from "@google/genai";
import { FormData, CameraMode, ChatMessage } from "../types";

// Helper to ensure we always get a fresh instance with the key
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => {
      reject(new Error(`Gagal membaca file ${file.name}. Kemungkinan file rusak atau tidak didukung browser.`));
    };
  });
};

export const generateCharacterImages = async (formData: FormData): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your .env configuration.");
  }

  let subjectBase64 = formData.subjectImageBase64;
  if (!subjectBase64 && formData.subjectImage) {
      subjectBase64 = await fileToBase64(formData.subjectImage);
  }

  if (!subjectBase64) {
    throw new Error("Subject image is required.");
  }

  const ai = getAI();

  const userPromptLower = (formData.prompt || "").toLowerCase();
  const isCloseUp = /\b(selfie|selpi|close-up|closeup|face|wajah|muka|kepala|portrait|headshot|dekat)\b/i.test(userPromptLower);
  const is916 = formData.aspectRatio === '9:16';
  
  let framingInstruction = "";
  if (isCloseUp) {
      framingInstruction = is916 
        ? "Framing: Vertical Selfie (9:16). Camera arm's length. Face fills 40-60% of width." 
        : "Framing: Extreme Close-up (Macro). Focus intensely on skin texture.";
  } else {
      framingInstruction = is916 
        ? "Framing: Vertical Full/Mid Shot (9:16). Show outfit from knees/waist up." 
        : "Framing: Cinematic Mid-shot (Waist up).";
  }

  let cameraSpecs = "";
  if (formData.cameraMode === CameraMode.IPHONE) {
      cameraSpecs = `iPhone 15 Pro Max (Main Sensor). Settings: RAW mode, NO computational smoothing. Artifacts: Visible sensor noise/grain. Look: "Phone Photo", amateur composition.`;
  } else {
      cameraSpecs = `Phase One XF IQ4 150MP (Medium Format). Lens: Rodenstock HR Digaron-W 32mm f/4. Settings: f/8 for maximum texture detail. Look: Hyper-detailed, optical perfection, RAW render.`;
  }

  const imageParts: any[] = [];
  
  imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: subjectBase64 } });

  let locBase64 = formData.locationImageBase64;
  if (!locBase64 && formData.locationImage) locBase64 = await fileToBase64(formData.locationImage);
  if (locBase64) {
    imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: locBase64 } });
  }

  let outfitBase64 = formData.outfitImageBase64;
  if (!outfitBase64 && formData.outfitImage) outfitBase64 = await fileToBase64(formData.outfitImage);
  if (outfitBase64) {
    imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: outfitBase64 } });
  }

  try {
    const imageCount = formData.imageCount || 2;
    const variations = [
        "Create a candid moment, imperfect shutter timing.",
        "Use harsh lighting to emphasize raw texture.",
        "Apply an off-center, documentary-style composition.",
        "Add slight motion blur on edges for a dynamic feel."
    ];
    
    const generateSingleImage = async (variation: string) => {
        const userCorePrompt = formData.prompt || `A candid, unposed photo of the person from the first input image.`;
        
        const promptParagraph = `
Generate a raw, unedited, candid photograph of the person from the first input image.

The setting is "${formData.locationText || 'a realistic environment'}", and the lighting must strictly match the second input image (if provided). The subject is wearing "${formData.outfitText || 'realistic daily wear'}", with physical characteristics described as "${formData.bodyDetails || 'natural and realistic'}". The main creative idea for the photo is: "${userCorePrompt}". For this specific version, the creative twist is: "${variation}".

**Mandatory Technical & Realism Directives:**
- **Camera & Framing:** The photo must look like it was taken with a ${cameraSpecs}, using this framing: ${framingInstruction}.
- **Identity Lock:** The person's face must be an exact match to the first input image. This is the highest priority.
- **Raw Realism:** Render hyper-realistic, imperfect skin with visible texture, subtle pores, and natural, uneven skin tone. The hairline must be imperfect with stray hairs. Absolutely no digital smoothing or beautification.

**Negative Prompt (Do Not Include):**
--style: beauty filter, smooth skin, studio lighting, perfect symmetry, model posing, overprocessed, airbrushed, plastic, doll, cgi, 3d render, illustration, cartoon, anime
`;

        const requestParts = [{ text: promptParagraph }, ...imageParts];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: requestParts },
            config: { imageConfig: { aspectRatio: formData.aspectRatio || "3:4" } }
        });
        
        return response;
    };


    // Parallel execution for speed
    const generationPromises = Array.from({ length: imageCount }, (_, i) => {
        const variationInstruction = variations[i] || `Generate variation ${i+1}.`;
        return generateSingleImage(variationInstruction);
    });

    const results = await Promise.allSettled(generationPromises);
    const successfulImages: string[] = [];
    const errors: string[] = [];

    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            const response = result.value;
            const candidate = response.candidates?.[0];
            
            if (candidate?.finishReason === 'SAFETY') {
                errors.push(`Image ${i + 1}: Ditolak karena kebijakan keamanan.`);
                return;
            }

            const imgPart = candidate?.content?.parts?.find(p => p.inlineData);
            if (imgPart?.inlineData) {
                successfulImages.push(imgPart.inlineData.data);
            } else {
                const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
                const preview = textPart ? textPart.substring(0, 100) : "No content";
                console.warn(`Image ${i+1} Returned Text Instead of Image:`, textPart);
                errors.push(`Image ${i + 1} Gagal: Model merespons dengan teks ("${preview}...")`);
            }
        } else { // 'rejected'
            let detailedError = "Unknown error";
            const error = result.reason as any;
            if (error && error.message) {
                try {
                    const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
                    detailedError = errorJson.error?.message || error.message;
                } catch (e) {
                    detailedError = error.message;
                }
            } else if (typeof error === 'object' && error !== null) {
                detailedError = JSON.stringify(error);
            }
            errors.push(`Image ${i + 1} Error: ${detailedError}`);
        }
    });


    if (successfulImages.length === 0) {
        throw new Error(`Gagal membuat gambar.\nDetail: ${errors.join('\n')}`);
    }

    return successfulImages;

  } catch (error: any) {
    console.error("Gemini Generation Fatal Error:", error);
    let message = error instanceof Error ? error.message : String(error);
    if (message.includes("400")) message = "Bad Request (400). Coba kurangi jumlah gambar atau sederhanakan prompt.";
    throw new Error(message);
  }
};

export const editCharacterImage = async (
  baseImageBase64: string, 
  instruction: string, 
  originalSubjectBase64?: string | null,
  originalContext?: Partial<FormData> | null
): Promise<string[]> => {
  const ai = getAI();
  
  const instructionLower = instruction.toLowerCase();
  
  let cameraSpecs = "";
  if (originalContext?.cameraMode === CameraMode.IPHONE) {
      cameraSpecs = `iPhone 15 Pro Max (Main Sensor). Settings: RAW mode, NO computational smoothing. Artifacts: Visible sensor noise/grain. Look: "Phone Photo", amateur composition.`;
  } else {
      cameraSpecs = `Phase One XF IQ4 150MP (Medium Format). Lens: Rodenstock HR Digaron-W 32mm f/4. Settings: f/8 for maximum texture detail. Look: Hyper-detailed, optical perfection, RAW render.`;
  }

  // Detect if a major change is requested
  const isMajorChange = /\b(sudut|angle|pose|gaya|latar|background|view|pandangan|lokasi|pindah)\b/i.test(instructionLower);

  const imageParts: any[] = [];
  
  // Base image for editing
  imageParts.push({ inlineData: { mimeType: 'image/png', data: baseImageBase64 } });
  // Original subject for identity lock
  if (originalSubjectBase64) {
      imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: originalSubjectBase64 } });
  }

  const generateSingle = async (variation: string) => {
    const realismRules = isMajorChange
    ? `
**Edit Mode: Re-imagine**
Re-create the scene and pose based on the user's instruction: "${instruction}". The new scene's lighting, camera style, and realism level must match the aesthetic of the first input image.
`
    : `
**Edit Mode: Retouch**
Apply this specific change: "${instruction}". Preserve all other details from the first input image, especially the background, lighting, and original skin texture.
`;
    
    const finalEditPrompt = `
You are editing a photograph. The first input image is the base to edit. The second input image (if provided) is the definitive reference for the person's facial identity.

${realismRules}

**Universal Rules (Mandatory):**
- **Identity Lock:** The person's face MUST be an exact match to the second input image (the identity reference).
- **Camera Consistency:** The final edit must look like it was taken with a ${cameraSpecs}.
- **Raw Realism:** Maintain realistic, imperfect skin texture. Do not add any digital smoothing or beauty filters.
- **Variation Note for this version:** ${variation}.

**Negative Prompt (Do Not Include):**
--style: beauty filter, smooth skin, studio lighting, perfect symmetry, model posing, overprocessed, airbrushed, plastic, doll, cgi, 3d render, illustration, cartoon, anime
`;


    const requestParts = [{ text: finalEditPrompt }, ...imageParts];

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: requestParts },
        config: { imageConfig: { aspectRatio: originalContext?.aspectRatio || '3:4' } }
    });
    
    const candidate = res.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') throw new Error("Ditolak karena kebijakan keamanan");
    
    const imgPart = candidate?.content?.parts?.find(p => p.inlineData);
    if (imgPart?.inlineData) return imgPart.inlineData.data;
    
    const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
    if (textPart) throw new Error(`Model merespons dengan teks: ${textPart.substring(0, 50)}...`);
    
    return null;
  };

  try {
    const isMultiple = /\b(2|two|dua|couple|pair|double|sepasang|banyak)\b/i.test(instruction);
    const numberOfImages = isMultiple ? 2 : 1;
    const variations = ["Generate the first variation.", "Generate a second, different variation."];

    // Parallel execution for speed
    const editPromises = Array.from({ length: numberOfImages }, (_, i) => {
        const variation = (numberOfImages > 1) ? (variations[i] || `Variation ${i+1}`) : "Generate the result.";
        return generateSingle(variation);
    });

    const results = await Promise.allSettled(editPromises);

    const validResults: string[] = [];
    const errors: string[] = [];

    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            validResults.push(result.value);
        } else if (result.status === 'rejected') {
            errors.push((result.reason as Error).message || "Unknown edit error");
        }
    });

    if (validResults.length === 0) {
        throw new Error(`Gagal mengedit gambar. ${errors.join(', ') || "Tidak ada hasil yang valid."}`);
    }

    return validResults;

  } catch (e: any) {
    console.error("Edit error:", e);
    throw new Error(e.message || "Gagal melakukan editan.");
  }
};