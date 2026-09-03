import {
  createContext,
  useContext,
} from "react";

/*
  Members can be added from any page through the
  sidebar, so pages that list members watch this
  version number and reload when it changes.
*/
export const MembersRefreshContext =
  createContext({
    membersVersion: 0,
    notifyMembersChanged: () => {},
    openAddMember: () => {},
  });

export function useMembersRefresh() {
  return useContext(
    MembersRefreshContext
  );
}
