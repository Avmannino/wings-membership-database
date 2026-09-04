import {
  useEffect,
  useRef,
} from "react";

export default function useBarcodeScanner(
  onScan,
  {
    enabled = true,
    minimumLength = 3,
    maximumDelay = 500,
    idleSubmitDelay = 120,
    scannerMaxGap = 35,
  } = {}
) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const submitTimerRef = useRef(null);
  const fastKeyCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function clearSubmitTimer() {
      if (submitTimerRef.current) {
        clearTimeout(
          submitTimerRef.current
        );

        submitTimerRef.current = null;
      }
    }

    function resetScanner() {
      bufferRef.current = "";
      lastKeyTimeRef.current = 0;
      fastKeyCountRef.current = 0;

      clearSubmitTimer();
    }

    /*
      A hardware scanner types far faster than a
      person can. Treat the buffer as a scan only
      when most of the gaps between keys were too
      short to be human.
    */
    function looksLikeScan() {
      const length =
        bufferRef.current.length;

      if (length < minimumLength) {
        return false;
      }

      const gaps = length - 1;

      if (gaps < 1) {
        return false;
      }

      return (
        fastKeyCountRef.current >=
        Math.ceil(gaps * 0.7)
      );
    }

    function submitScan() {
      const scannedValue =
        bufferRef.current.trim();

      const wasScan = looksLikeScan();

      resetScanner();

      if (wasScan) {
        onScan(scannedValue);
      }
    }

    function scheduleAutomaticSubmit() {
      clearSubmitTimer();

      submitTimerRef.current =
        setTimeout(() => {
          submitScan();
        }, idleSubmitDelay);
    }

    function handleKeyDown(event) {
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      /*
        Autofill and some browser extensions raise
        keydown events that carry no key at all.
      */
      if (
        typeof event.key !== "string"
      ) {
        return;
      }

      const currentTime = Date.now();

      /*
        Many scanners finish with Enter.
        Some use Tab instead.
      */
      if (
        event.key === "Enter" ||
        event.key === "Tab"
      ) {
        if (looksLikeScan()) {
          event.preventDefault();
          event.stopPropagation();
          submitScan();
        } else {
          resetScanner();
        }

        return;
      }

      /*
        Ignore Shift, Control, arrows, etc.
      */
      if (event.key.length !== 1) {
        return;
      }

      const gap =
        currentTime -
        lastKeyTimeRef.current;

      /*
        If there was a very long pause between
        characters, assume this is a new scan.
      */
      if (
        lastKeyTimeRef.current &&
        gap > maximumDelay
      ) {
        bufferRef.current = "";
        fastKeyCountRef.current = 0;
      } else if (
        lastKeyTimeRef.current &&
        gap <= scannerMaxGap
      ) {
        fastKeyCountRef.current += 1;
      }

      bufferRef.current +=
        event.key;

      lastKeyTimeRef.current =
        currentTime;

      /*
        Once the burst is clearly machine-speed,
        keep the remaining characters out of any
        focused input so a scan works no matter
        where the cursor happens to be.
      */
      if (looksLikeScan()) {
        event.preventDefault();
        event.stopPropagation();
      }

      /*
        This allows scanners that do NOT send
        Enter or Tab to still work.

        Once characters stop arriving for 120ms,
        treat the collected value as the scan.
      */
      scheduleAutomaticSubmit();
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );

      clearSubmitTimer();
    };
  }, [
    enabled,
    idleSubmitDelay,
    maximumDelay,
    minimumLength,
    onScan,
    scannerMaxGap,
  ]);
}
