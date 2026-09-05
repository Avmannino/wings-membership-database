import {
  useEffect,
  useRef,
  useState,
} from "react";

/*
  A table cell that turns into an input when clicked.
  Enter or moving away commits, Escape abandons the
  edit and puts the original value back.
*/
function EditableCell({
  value,
  type = "currency",
  display,
  onSave,
  className = "",
  title,
}) {
  const [editing, setEditing] =
    useState(false);

  const [draft, setDraft] = useState("");
  const [saving, setSaving] =
    useState(false);

  const inputRef = useRef(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    if (saving) {
      return;
    }

    committedRef.current = false;
    setDraft(
      value === null ||
        value === undefined
        ? ""
        : String(value)
    );

    setEditing(true);
  }

  async function commit() {
    if (committedRef.current) {
      return;
    }

    committedRef.current = true;
    setEditing(false);

    const next =
      type === "currency"
        ? Number(draft)
        : draft;

    if (
      type === "currency" &&
      !Number.isFinite(next)
    ) {
      return;
    }

    if (String(next) === String(value)) {
      return;
    }

    setSaving(true);

    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      committedRef.current = true;
      setEditing(false);
    }

    /*
      The scanner listens on the window, so keystrokes
      typed here must not also be read as a scan.
    */
    event.stopPropagation();
  }

  if (editing) {
    return (
      <td className={className}>
        <input
          ref={inputRef}
          className="editable-cell-input"
          type={
            type === "currency"
              ? "number"
              : "date"
          }
          value={draft}
          onChange={(event) =>
            setDraft(
              event.target.value
            )
          }
          onKeyDown={handleKeyDown}
          onBlur={commit}
          step={
            type === "currency"
              ? "1"
              : undefined
          }
          min={
            type === "currency"
              ? "0"
              : undefined
          }
        />
      </td>
    );
  }

  return (
    <td
      className={`${className} editable-cell ${
        saving
          ? "editable-cell-saving"
          : ""
      }`}
      onClick={startEditing}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          startEditing();
        }
      }}
      role="button"
      tabIndex={0}
      title={
        title || "Click to edit"
      }
    >
      {display}
    </td>
  );
}

export default EditableCell;
