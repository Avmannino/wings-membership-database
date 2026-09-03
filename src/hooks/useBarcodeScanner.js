import { useEffect, useRef } from "react";

export default function useBarcodeScanner(
  onScan,
  {
    enabled = true,
    minimumLength = 3,
    maximumDelay = 100,
  } = {}
) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const currentTime = Date.now();

      if (event.key === "Enter") {
        const scannedValue = bufferRef.current.trim();

        if (scannedValue.length >= minimumLength) {
          onScan(scannedValue);
        }

        bufferRef.current = "";
        lastKeyTimeRef.current = 0;

        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      if (
        lastKeyTimeRef.current &&
        currentTime - lastKeyTimeRef.current > maximumDelay
      ) {
        bufferRef.current = "";
      }

      bufferRef.current += event.key;
      lastKeyTimeRef.current = currentTime;
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enabled,
    maximumDelay,
    minimumLength,
    onScan,
  ]);
}