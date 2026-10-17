import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the custom type scale. Without this it reads e.g.
// `text-13` or `text-body-sm` as a colour, so cn("text-13", "text-white")
// silently drops one of them.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "11",
            "13",
            "heading-1",
            "heading-2",
            "heading-3",
            "heading-4",
            "heading-5",
            "heading-6",
            "body-lg",
            "body-base",
            "body-sm",
            "caption-lg",
            "caption-base",
            "caption-sm",
            "caption-xs",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
