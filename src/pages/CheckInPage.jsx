import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ScanLine,
  UserRound,
  Users,
  UserX,
  WifiOff,
  X,
} from "lucide-react";

import {
  useCallback,
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
  const [result, setResult] =
    useState(null);

  const [manualCode, setManualCode] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const processingRef = useRef(false);

  const closeResult = useCallback(() => {
    setResult(null);
  }, []);

  /*
    The result stays on screen until staff dismiss
    it, either with the close button or by clicking
    the backdrop outside the modal.
  */
  function handleBackdropClick(event) {
    if (
      event.target === event.currentTarget
    ) {
      closeResult();
    }
  }

  const handleScan = useCallback(
    async (rawCode) => {
      if (processingRef.current) {
        return;
      }

      const qrToken = rawCode
        .trim()
        .toUpperCase();

      if (!qrToken) {
        return;
      }

      processingRef.current = true;
      setProcessing(true);

      /*
        A scan can land while the cursor sits in the
        manual test field, so clear anything the
        scanner leaked into it.
      */
      setManualCode("");

      try {
        const member =
          await getMemberByQrToken(
            qrToken
          );

        if (!member) {
          await recordCheckIn({
            qrToken,
            result: "not_found",
          });

          setResult({
            type: "not_found",
            qrToken,
          });

          return;
        }

        const membershipState =
          getMembershipState(member);

        await recordCheckIn({
          memberId: member.id,
          qrToken,
          result: membershipState,
          memberName:
            `${member.firstName} ${member.lastName}`,
          membershipType:
            member.membershipType,
        });

        setResult({
          type: membershipState,
          member,
        });
      } catch (error) {
        console.error(
          "Check-in failed:",
          error
        );

        setResult({
          type: "system_error",
        });
      } finally {
        processingRef.current = false;
        setProcessing(false);
      }
    },
    []
  );

  useBarcodeScanner(handleScan);

  async function handleManualSubmit(
    event
  ) {
    event.preventDefault();

    const code = manualCode;

    setManualCode("");

    await handleScan(code);
  }

  function renderMemberInformation(
    member
  ) {
    if (!member) {
      return null;
    }

    const familyMembers =
      Array.isArray(
        member.familyMembers
      )
        ? member.familyMembers
        : [];

    return (
      <div className="scan-member-information">
        <div className="scan-member-name-block">
          <div className="scan-member-avatar">
            <UserRound size={28} />
          </div>

          <div>
            <span className="scan-info-label">
              Member
            </span>

            <h3>
              {member.firstName}{" "}
              {member.lastName}
            </h3>
          </div>
        </div>

        <div className="scan-info-grid">
          <div className="scan-info-item">
            <span className="scan-info-label">
              Membership
            </span>

            <strong>
              {member.membershipType}
            </strong>
          </div>

          <div className="scan-info-item">
            <span className="scan-info-label">
              Status
            </span>

            <strong className="scan-status-value">
              {getMembershipState(
                member
              ) === "active"
                ? "Active"
                : "Expired"}
            </strong>
          </div>

          <div className="scan-info-item">
            <div className="scan-info-icon-label">
              <CalendarDays
                size={15}
              />

              <span className="scan-info-label">
                Start Date
              </span>
            </div>

            <strong>
              {formatDate(
                member.startDate
              )}
            </strong>
          </div>

          <div className="scan-info-item">
            <div className="scan-info-icon-label">
              <CalendarDays
                size={15}
              />

              <span className="scan-info-label">
                Expiration
              </span>
            </div>

            <strong
              className={
                result?.type ===
                "expired"
                  ? "expired-date-value"
                  : ""
              }
            >
              {formatDate(
                member.expirationDate
              )}
            </strong>
          </div>
        </div>

        {member.membershipType ===
          "Family" &&
          familyMembers.length >
            0 && (
            <div className="scan-family-section">
              <div className="scan-family-header">
                <Users size={18} />

                <div>
                  <span className="scan-info-label">
                    Family Membership
                  </span>

                  <strong>
                    Covered Family
                    Members
                  </strong>
                </div>
              </div>

              <div className="scan-family-list">
                {familyMembers.map(
                  (
                    familyMember,
                    index
                  ) => (
                    <div
                      className="scan-family-member"
                      key={`${familyMember.name}-${index}`}
                    >
                      <span className="scan-family-name">
                        {
                          familyMember.name
                        }
                      </span>

                      <span className="scan-family-relationship">
                        {
                          familyMember.relationship
                        }
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
      </div>
    );
  }

  function renderResultModal() {
    if (!result) {
      return null;
    }

    if (result.type === "active") {
      return (
        <div
          className="scan-result-backdrop"
          onClick={handleBackdropClick}
        >
          <div className="scan-result-modal scan-result-success">
            <button
              type="button"
              className="scan-result-close"
              onClick={closeResult}
              aria-label="Close check-in result"
            >
              <X size={22} />
            </button>

            <div className="scan-result-header">
              <div className="scan-result-icon">
                <CheckCircle2
                  size={56}
                  strokeWidth={2}
                />
              </div>

              <div>
                <span className="scan-result-eyebrow">
                  Check-In
                  Successful
                </span>

                <h2>
                  Membership Active
                </h2>

                <p>
                  Welcome to Wings
                  Arena.
                </p>
              </div>
            </div>

            {renderMemberInformation(
              result.member
            )}

            <div className="scan-result-footer">
              Check-in recorded
              successfully.
            </div>
          </div>
        </div>
      );
    }

    if (result.type === "expired") {
      return (
        <div
          className="scan-result-backdrop"
          onClick={handleBackdropClick}
        >
          <div className="scan-result-modal scan-result-error">
            <button
              type="button"
              className="scan-result-close"
              onClick={closeResult}
              aria-label="Close check-in result"
            >
              <X size={22} />
            </button>

            <div className="scan-result-header">
              <div className="scan-result-icon">
                <AlertTriangle
                  size={56}
                  strokeWidth={2}
                />
              </div>

              <div>
                <span className="scan-result-eyebrow">
                  Check-In Denied
                </span>

                <h2>
                  Membership Expired
                </h2>

                <p>
                  Please see the front
                  desk before entering.
                </p>
              </div>
            </div>

            {renderMemberInformation(
              result.member
            )}

            <div className="scan-result-footer">
              This membership must be
              renewed before check-in.
            </div>
          </div>
        </div>
      );
    }

    if (
      result.type === "system_error"
    ) {
      return (
        <div
          className="scan-result-backdrop"
          onClick={handleBackdropClick}
        >
          <div className="scan-result-modal scan-result-error">
            <button
              type="button"
              className="scan-result-close"
              onClick={closeResult}
              aria-label="Close check-in result"
            >
              <X size={22} />
            </button>

            <div className="scan-result-header">
              <div className="scan-result-icon">
                <WifiOff
                  size={56}
                  strokeWidth={2}
                />
              </div>

              <div>
                <span className="scan-result-eyebrow">
                  System Error
                </span>

                <h2>
                  Unable to Verify
                  Membership
                </h2>

                <p>
                  Please see the front
                  desk.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
          className="scan-result-backdrop"
          onClick={handleBackdropClick}
        >
        <div className="scan-result-modal scan-result-error">
          <button
            type="button"
            className="scan-result-close"
            onClick={closeResult}
            aria-label="Close check-in result"
          >
            <X size={22} />
          </button>

          <div className="scan-result-header">
            <div className="scan-result-icon">
              <UserX
                size={56}
                strokeWidth={2}
              />
            </div>

            <div>
              <span className="scan-result-eyebrow">
                Check-In Denied
              </span>

              <h2>
                Pass Not Recognized
              </h2>

              <p>
                This membership pass
                could not be found.
              </p>
            </div>
          </div>

          <div className="unknown-pass-token">
            <span>
              Scanned Token
            </span>

            <strong>
              {result.qrToken}
            </strong>
          </div>
        </div>
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

          <h2>
            Membership Check-In
          </h2>
        </div>

        <div className="check-in-status-dot">
          <span />
          Firebase Connected
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

      {renderResultModal()}
    </div>
  );
}

export default CheckInPage;