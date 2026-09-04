import {
  useEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  Mail,
  MessageSquare,
  Printer,
  Send,
} from "lucide-react";

import {
  QRCodeCanvas,
  QRCodeSVG,
} from "qrcode.react";

import { sendPassEmail } from "../services/passEmailService";

import {
  buildPassDocument,
  buildSmsUrl,
  getPassRecipient,
} from "../utils/passDelivery";

function SendPassMenu({
  member,
  compact = false,
}) {
  const [open, setOpen] =
    useState(false);

  const [notice, setNotice] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [
    menuPosition,
    setMenuPosition,
  ] = useState(null);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const qrSourceRef = useRef(null);

  const recipient =
    getPassRecipient(member);

  /*
    A row notice sits over the table, so it clears
    itself once it has been read.
  */
  useEffect(() => {
    if (
      !compact ||
      !notice ||
      sending
    ) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setNotice(""),
      6000
    );

    return () =>
      window.clearTimeout(timer);
  }, [compact, notice, sending]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(
      event
    ) {
      const insideTrigger =
        containerRef.current?.contains(
          event.target
        );

      const insideMenu =
        menuRef.current?.contains(
          event.target
        );

      if (
        !insideTrigger &&
        !insideMenu
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handleReposition() {
      setOpen(false);
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "scroll",
      handleReposition,
      true
    );

    window.addEventListener(
      "resize",
      handleReposition
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "scroll",
        handleReposition,
        true
      );

      window.removeEventListener(
        "resize",
        handleReposition
      );
    };
  }, [open]);

  function toggleMenu() {
    setNotice("");

    setOpen((current) => {
      const next = !current;

      /*
        The members table scrolls horizontally, which
        would clip an absolutely positioned menu, so
        the compact menu is placed against the
        viewport instead.
      */
      if (
        next &&
        compact &&
        triggerRef.current
      ) {
        const rect =
          triggerRef.current.getBoundingClientRect();

        setMenuPosition({
          top: rect.bottom + 6,
          right:
            window.innerWidth -
            rect.right,
        });
      }

      return next;
    });
  }

  async function handleSendEmail() {
    setOpen(false);
    setSending(true);
    setNotice(
      `Sending the pass to ${recipient.email}...`
    );

    try {
      await sendPassEmail({
        member,
        qrPngBase64:
          readQrPngBase64(),
      });

      setNotice(
        `Pass sent to ${recipient.email}.`
      );
    } catch (sendError) {
      console.error(
        "Unable to send pass email:",
        sendError
      );

      setNotice(
        sendError.message ||
          "Unable to send this pass."
      );
    } finally {
      setSending(false);
    }
  }

  function readQrPngBase64() {
    const canvas =
      qrSourceRef.current?.querySelector(
        "canvas"
      );

    if (!canvas) {
      return "";
    }

    return canvas
      .toDataURL("image/png")
      .split(",")[1];
  }

  function handleSendSms() {
    window.location.href =
      buildSmsUrl(member);

    setOpen(false);
    setNotice(
      "Opening your messaging app with the pass details."
    );
  }

  function handlePrint() {
    const svgElement =
      qrSourceRef.current?.querySelector(
        "svg"
      );

    if (!svgElement) {
      setNotice(
        "Unable to build the pass right now."
      );

      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=520,height=680"
    );

    if (!printWindow) {
      setNotice(
        "Your browser blocked the print window. Allow pop-ups and try again."
      );

      return;
    }

    printWindow.document.write(
      buildPassDocument(
        member,
        svgElement.outerHTML
      )
    );

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    setOpen(false);
    setNotice("");
  }

  const optionButtons = (
    <>
      <button
        type="button"
        className="secondary-button send-pass-option"
        onClick={handleSendEmail}
        disabled={
          !recipient.email || sending
        }
        title={
          recipient.email
            ? `Email the pass to ${recipient.email}`
            : "Add an email address to enable this option"
        }
      >
        <Mail size={16} />
        Email
      </button>

      <button
        type="button"
        className="secondary-button send-pass-option"
        onClick={handleSendSms}
        disabled={!recipient.phone}
        title={
          recipient.phone
            ? `Text the pass to ${recipient.phone}`
            : "Add a phone number to enable this option"
        }
      >
        <MessageSquare size={16} />
        SMS
      </button>

      <button
        type="button"
        className="secondary-button send-pass-option"
        onClick={handlePrint}
      >
        <Printer size={16} />
        Print
      </button>
    </>
  );

  return (
    <div
      className="send-pass-section"
      ref={containerRef}
    >
      {compact ? (
        <button
          type="button"
          ref={triggerRef}
          className="icon-button"
          title={
            sending
              ? "Sending pass..."
              : "Send QR code"
          }
          onClick={toggleMenu}
          disabled={
            !recipient.token || sending
          }
          aria-expanded={open}
        >
          <Send size={18} />
        </button>
      ) : (
        <button
          type="button"
          ref={triggerRef}
          className="secondary-button send-pass-toggle"
          onClick={toggleMenu}
          disabled={
            !recipient.token || sending
          }
          aria-expanded={open}
        >
          <Send size={17} />
          {sending
            ? "Sending..."
            : "Send QR Code"}
        </button>
      )}

      {open &&
        !compact && (
          <div
            className="send-pass-options"
            ref={menuRef}
          >
            {optionButtons}
          </div>
        )}

      {open &&
        compact &&
        menuPosition &&
        createPortal(
          <div
            className="send-pass-options send-pass-options-floating"
            ref={menuRef}
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            {optionButtons}
          </div>,
          document.body
        )}

      {notice &&
        (compact ? (
          <p
            className="send-pass-notice send-pass-notice-floating"
            role="status"
          >
            {notice}
          </p>
        ) : (
          <p
            className="send-pass-notice"
            role="status"
          >
            {notice}
          </p>
        ))}

      <div
        ref={qrSourceRef}
        aria-hidden="true"
        className="send-pass-qr-source"
      >
        {recipient.token && (
          <>
            <QRCodeSVG
              value={recipient.token}
              size={220}
              level="H"
            />

            <QRCodeCanvas
              value={recipient.token}
              size={320}
              level="H"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default SendPassMenu;
