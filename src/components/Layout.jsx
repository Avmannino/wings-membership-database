import {
  LayoutDashboard,
  ScanLine,
  Users,
} from "lucide-react";

import {
  NavLink,
  Outlet,
} from "react-router-dom";

function Layout() {
  return (
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
    </div>
  );
}

export default Layout;