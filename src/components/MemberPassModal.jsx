import {
  Printer,
  X,
} from "lucide-react";

import { QRCodeSVG } from "qrcode.react";

import SendPassMenu from "./SendPassMenu";

import { formatDate } from "../utils/dateUtils";

function MemberPassModal({
  member,
  onClose,
}) {
  if (!member) {
    return null;
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal member-pass-modal">
        <div className="modal-header no-print">
          <div>
            <h2>Membership Pass</h2>

            <p>
              Scan this QR code at the Wings Arena front
              desk.
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="member-pass">
          <div className="member-pass-brand">
            WINGS ARENA
          </div>

          <div className="member-pass-type">
            {member.membershipType}
          </div>

          <div className="member-pass-qr">
            <QRCodeSVG
              value={member.qrToken}
              size={220}
              level="H"
            />
          </div>

          <h3>
            {member.firstName} {member.lastName}
          </h3>

          <div className="member-pass-expiration">
            Valid through{" "}
            <strong>
              {formatDate(member.expirationDate)}
            </strong>
          </div>

          <div className="member-pass-token">
            {member.qrToken}
          </div>
        </div>

        <div className="modal-actions no-print">
          <div className="pass-modal-send">
            <SendPassMenu
              member={member}
            />
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={handlePrint}
          >
            <Printer size={18} />
            Print Pass
          </button>
        </div>
      </div>
    </div>
  );
}

export default MemberPassModal;