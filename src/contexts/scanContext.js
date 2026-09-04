import {
  createContext,
  useContext,
} from "react";

/*
  Scanning is handled by the layout so a pass read at
  the front desk shows its result on whatever screen
  staff happen to be on.
*/
export const ScanContext =
  createContext({
    result: null,
    processing: false,
    handleScan: async () => {},
    closeResult: () => {},
  });

export function useScan() {
  return useContext(ScanContext);
}
