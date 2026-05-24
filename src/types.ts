export type ElementType = "text" | "rect" | "circle" | "line" | "link" | "pencil";

export interface MessageBookmark {
  id: string;
  messageId: string;
  label: string;
  messageText: string;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fill?: string;
  stroke?: string;
  dash?: number[];
  style?: "normal" | "bold" | "italic";
  isResized?: boolean;
  linkData?: {
    title: string;
    description: string;
    image?: string;
    url: string;
  };
  points?: number[]; // Used for both Relationship Lines and Freehand Pencil
  bookmarks?: MessageBookmark[];
  zIndex?: number;
}

export interface CanvasState {
  elements: CanvasElement[];
}

export interface Message {
  id: string;
  text: string;
  timestamp: number;
  userId: string;
  userName: string;
  isPinned?: boolean;
}

export interface MatchLocation {
  messageId: string;
  globalIndex: number;
  indexInMessage: number;
}

