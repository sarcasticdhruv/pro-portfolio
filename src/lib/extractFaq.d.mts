export interface FaqPair {
  question: string;
  answer: string;
}

export function extractFaqPairs(markdown: string): FaqPair[];
