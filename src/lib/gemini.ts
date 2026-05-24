import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

export const ai = new GoogleGenAI({ apiKey });
export const GEMINI_MODEL = "gemini-3-flash-preview";

export const COLLABORATION_PROMPT = "You are CanvasChat Assistant, a helpful collaborator in a zoomable canvas workspace. Keep your responses concise and helpful. You can suggest things to add to the canvas or help organize thoughts.";
