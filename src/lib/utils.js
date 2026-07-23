import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
// Function definition
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function getRating({ rating }) {
    if (rating === 'FIVE') return 5;
    if (rating === 'FOUR') return 4;
    if (rating === 'THREE') return 3;
    if (rating === 'TWO') return 2;
    if (rating === 'ONE') return 1;
}