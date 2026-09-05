import {
  LayoutDashboard,
  LogOut,
  ScanLine,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
} from "react-router-dom";

import MemberFormModal from "./MemberFormModal";
import ScanResultModal from "./ScanResultModal";

import { useAuth } from "../contexts/AuthContext";
import { MembersRefreshContext } from "../contexts/membersRefreshContext";
import { ScanContext } from "../contexts/scanContext";

import useBarcodeScanner from "../hooks/useBarcodeScanner";

import {
  addMember,
  getMemberByQrToken,
  recordCheckIn,
} from "../services/memberService";

import { getMembershipState } from "../utils/dateUtils";

function Layout() {
  const { logout } = useAuth();

  const [
    showAddMember,
    setShowAddMember,
  ] = useState(false);

  const [
    membersVersion,
    setMembersVersion,
  ] = useState(0);

  const notifyMembersChanged =
    useCallback(() => {
      setMembersVersion(
        (version) => version + 1
      );
    }, []);

  const openAddMember =
    useCallback(() => {
      setShowAddMember(true);
    }, []);

  const refreshValue = useMemo(
    () => ({
      membersVersion,
      notifyMembersChanged,
      openAddMember,
    }),
    [
      membersVersion,
      notifyMembersChanged,
      openAddMember,
    ]
  );

  const [scanResult, setScanResult] =
    useState(null);

  const [
    scanProcessing,
    setScanProcessing,
  ] = useState(false);

  const scanProcessingRef =
    useRef(false);

  const closeScanResult =
    useCallback(() => {
      setScanResult(null);
    }, []);

  const handleScan = useCallback(
    async (rawCode) => {
      if (scanProcessingRef.current) {
        return;
      }

      const qrToken = rawCode
        .trim()
        .toUpperCase();

      if (!qrToken) {
        return;
      }

      scanProcessingRef.current = true;
      setScanProcessing(true);

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

          setScanResult({
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

        setScanResult({
          type: membershipState,
          member,
        });
      } catch (error) {
        console.error(
          "Check-in failed:",
          error
        );

        setScanResult({
          type: "system_error",
        });
      } finally {
        scanProcessingRef.current = false;
        setScanProcessing(false);
      }
    },
    []
  );

  useBarcodeScanner(handleScan);

  const scanValue = useMemo(
    () => ({
      result: scanResult,
      processing: scanProcessing,
      handleScan,
      closeResult: closeScanResult,
    }),
    [
      scanResult,
      scanProcessing,
      handleScan,
      closeScanResult,
    ]
  );

  async function handleAddMember(
    form
  ) {
    await addMember(form);

    notifyMembersChanged();
    setShowAddMember(false);
  }

  return (
    <ScanContext.Provider
      value={scanValue}
    >
      <MembersRefreshContext.Provider
        value={refreshValue}
      >
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">W</div>

            <div>
              <div className="sidebar-brand-title">
                Wings Arena
              </div>

              <div className="sidebar-brand-subtitle">
                Memberships
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <NavLink
              to="/check-in"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <ScanLine size={20} />
              <span>Check-In</span>
            </NavLink>

            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/members"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Users size={20} />
              <span>Members</span>
            </NavLink>

            <NavLink
              to="/revenue"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <TrendingUp size={20} />
              <span>Revenue Schedule</span>
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-signout"
              onClick={logout}
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>

        {showAddMember && (
          <MemberFormModal
            onClose={() =>
              setShowAddMember(false)
            }
            onSave={handleAddMember}
          />
        )}

        {scanResult && (
          <ScanResultModal
            result={scanResult}
            onClose={closeScanResult}
          />
        )}
      </div>
      </MembersRefreshContext.Provider>
    </ScanContext.Provider>
  );
}

export default Layout;
