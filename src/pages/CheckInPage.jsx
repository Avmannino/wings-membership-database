import {
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  ShieldX,
  UserX,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import useBarcodeScanner from "../hooks/useBarcodeScanner";

import {
  getMemberByQrToken,
  recordCheckIn,
} from "../services/memberService";

import {
  formatDate,
  getMembershipState,
} from "../utils/dateUtils";

function CheckInPage() {
  const [result, setResult] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const resetTimerRef = useRef(null);

  const handleScan = useCallback((rawCode) => {
    const qrToken = rawCode.trim().toUpperCase();

    if (!qrToken) {
      return;
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    const member = getMemberByQrToken(qrToken);

    if (!member) {
      recordCheckIn({
        qrToken,
        result: "not_found",
      });

      setResult({
        type: "not_found",
        qrToken,
      });

      resetTimerRef.current = setTimeout(() => {
        setResult(null);
      }, 3500);

      return;
    }

    const membershipState =
      getMembershipState(member);

    recordCheckIn({
      memberId: member.id,
      qrToken,
      result: membershipState,
    });

    setResult({
      type: membershipState,
      member,
    });

    resetTimerRef.current = setTimeout(() => {
      setResult(null);
    }, 3500);
  }, []);

  useBarcodeScanner(handleScan);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  function handleManualSubmit(event) {
    event.preventDefault();

    handleScan(manualCode);
    setManualCode("");
  }

  function renderResult() {
    if (!result) {
      return (
        <div className="check-in-idle">
          <div className="scan-icon">
            <ScanLine size={72} strokeWidth={1.5} />
          </div>

          <h1>Member Check-In</h1>

          <p>
            Scan your Wings Arena membership pass.
          </p>

          <div className="scanner-ready">
            Scanner Ready
          </div>
        </div>
      );
    }

    if (result.type === "active") {
      return (
        <div className="check-in-result success">
          <CheckCircle2
            className="result-icon"
            size={94}
          />

          <div className="result-label">
            Membership Active
          </div>

          <h1>
            Welcome, {result.member.firstName}
          </h1>

          <div className="result-member-name">
            {result.member.firstName}{" "}
            {result.member.lastName}
          </div>

          <div className="result-membership-type">
            {result.member.membershipType}
          </div>

          <div className="result-expiration">
            Valid through{" "}
            <strong>
              {formatDate(
                result.member.expirationDate
              )}
            </strong>
          </div>
        </div>
      );
    }

    if (result.type === "expired") {
      return (
        <div className="check-in-result error">
          <AlertTriangle
            className="result-icon"
            size={94}
          />

          <div className="result-label">
            Membership Expired
          </div>

          <h1>
            {result.member.firstName}{" "}
            {result.member.lastName}
          </h1>

          <p>Please see the front desk.</p>

          <div className="result-expiration">
            Expired{" "}
            <strong>
              {formatDate(
                result.member.expirationDate
              )}
            </strong>
          </div>
        </div>
      );
    }

    if (
      result.type === "suspended" ||
      result.type === "inactive"
    ) {
      return (
        <div className="check-in-result warning">
          <ShieldX
            className="result-icon"
            size={94}
          />

          <div className="result-label">
            Membership Unavailable
          </div>

          <h1>
            {result.member.firstName}{" "}
            {result.member.lastName}
          </h1>

          <p>Please see the front desk.</p>
        </div>
      );
    }

    return (
      <div className="check-in-result error">
        <UserX
          className="result-icon"
          size={94}
        />

        <div className="result-label">
          Pass Not Recognized
        </div>

        <h1>Unable to Check In</h1>

        <p>Please see the front desk.</p>
      </div>
    );
  }

  return (
    <div className="check-in-page">
      <div className="check-in-topbar">
        <div>
          <span className="eyebrow">
            Wings Arena
          </span>

          <h2>Membership Check-In</h2>
        </div>

        <div className="check-in-status-dot">
          <span />
          System Ready
        </div>
      </div>

      <section className="check-in-stage">
        {renderResult()}
      </section>

      <form
        className="manual-scan-panel"
        onSubmit={handleManualSubmit}
      >
        <div>
          <strong>Test a Scan</strong>

          <span>
            You can manually enter a token while we are
            developing.
          </span>
        </div>

        <div className="manual-scan-controls">
          <input
            value={manualCode}
            onChange={(event) =>
              setManualCode(event.target.value)
            }
            placeholder="Try WINGS-1001"
          />

          <button
            type="submit"
            className="primary-button"
          >
            Test Scan
          </button>
        </div>

        <div className="demo-token-list">
          <span>Active: WINGS-1001</span>
          <span>Expiring soon: WINGS-1002</span>
          <span>Expired: WINGS-1003</span>
          <span>Suspended: WINGS-1004</span>
        </div>
      </form>
    </div>
  );
}

export default CheckInPage;