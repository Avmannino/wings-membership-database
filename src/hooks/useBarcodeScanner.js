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
  } = {}
) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const submitTimerRef = useRef(null);

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

      clearSubmitTimer();
    }

    function submitScan() {
      const scannedValue =
        bufferRef.current.trim();

      if (
        scannedValue.length >=
        minimumLength
      ) {
        console.log(
          "Barcode scanner detected:",
          scannedValue
        );

        onScan(scannedValue);
      }

      resetScanner();
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

      const target = event.target;

      const isTypingField =
        target instanceof HTMLElement &&
        (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable
        );

      /*
        If the user is manually typing into a form,
        let the form behave normally.

        The barcode scanner listener will handle
        scans when the regular page/body has focus.
      */
      if (isTypingField) {
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
        if (bufferRef.current) {
          event.preventDefault();
          submitScan();
        }

        return;
      }

      /*
        Ignore Shift, Control, arrows, etc.
      */
      if (event.key.length !== 1) {
        return;
      }

      /*
        If there was a very long pause between
        characters, assume this is a new scan.
      */
      if (
        lastKeyTimeRef.current &&
        currentTime -
          lastKeyTimeRef.current >
          maximumDelay
      ) {
        bufferRef.current = "";
      }

      bufferRef.current +=
        event.key;

      lastKeyTimeRef.current =
        currentTime;

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
  ]);
}