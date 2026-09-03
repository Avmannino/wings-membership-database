import {
  LayoutDashboard,
  ScanLine,
  Users,
} from "lucide-react";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
} from "react-router-dom";

import MemberFormModal from "./MemberFormModal";

import { MembersRefreshContext } from "../contexts/membersRefreshContext";

import { addMember } from "../services/memberService";

function Layout() {
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

  async function handleAddMember(
    form
  ) {
    await addMember(form);

    notifyMembersChanged();
    setShowAddMember(false);
  }

  return (
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
          </nav>

          <div className="sidebar-footer">
            Wings Arena
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
      </div>
    </MembersRefreshContext.Provider>
  );
}

export default Layout;
