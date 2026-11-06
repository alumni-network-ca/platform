import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names, letting a later Tailwind class replace an earlier one that sets the same thing. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
