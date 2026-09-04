import {
  ScanLine,
  UserPlus,
} from "lucide-react";

import { useState } from "react";

import { useMembersRefresh } from "../contexts/membersRefreshContext";
import { useScan } from "../contexts/scanContext";

function CheckInPage() {
  const [manualCode, setManualCode] =
    useState("");

  const { openAddMember } =
    useMembersRefresh();

  const {
    processing,
    handleScan,
  } = useScan();

  async function handleManualSubmit(
    event
  ) {
    event.preventDefault();

    const code = manualCode;

    setManualCode("");

    await handleScan(code);
  }

  return (
    <div className="check-in-page">
      <div className="check-in-topbar">
        <div>
          <span className="eyebrow">
            Wings Arena
          </span>

          <h2>
            Membership Check-In
          </h2>
        </div>

        <div className="check-in-topbar-actions">
          <div className="check-in-status-dot">
            <span />
            Firebase Connected
          </div>

          <button
            type="button"
            className="primary-button check-in-add-member"
            onClick={openAddMember}
          >
            <UserPlus size={20} />
            Add Member
          </button>
        </div>
      </div>

      <section className="check-in-stage">
        <div className="check-in-idle">
          <div className="scan-icon">
            <ScanLine
              size={72}
              strokeWidth={1.5}
            />
          </div>

          <h1>
            Member Check-In
          </h1>

          <p>
            Scan your Wings Arena
            membership pass.
          </p>

          <div className="scanner-ready">
            {processing
              ? "Checking Membership..."
              : "Scanner Ready"}
          </div>
        </div>
      </section>

      <form
        className="manual-scan-panel"
        onSubmit={handleManualSubmit}
      >
        <div>
          <strong>
            Test a Scan
          </strong>

          <span>
            Enter a member QR token
            manually while testing.
          </span>
        </div>

        <div className="manual-scan-controls">
          <input
            value={manualCode}
            onChange={(event) =>
              setManualCode(
                event.target.value
              )
            }
            placeholder="Enter QR token"
            disabled={processing}
          />

          <button
            type="submit"
            className="primary-button"
            disabled={
              processing ||
              !manualCode.trim()
            }
          >
            {processing
              ? "Checking..."
              : "Test Scan"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CheckInPage;