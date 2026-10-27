import { atom } from "jotai";

export const showMobileMenuAtom = atom(false);
export const showMobileFilterSheetAtom = atom(false);
export const selectedTagAtom = atom("all");
export const selectedProjectIdAtom = atom<string | number | null>(null);
export const isMobileScreenAtom = atom(false);

export const gridLinesAtom = atom({
  header: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  box: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
});
