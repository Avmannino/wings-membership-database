import {
  CircleDollarSign,
  Edit3,
  Gift,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";

import GiftCardDetailModal from "../components/GiftCardDetailModal";
import GiftCardFormModal from "../components/GiftCardFormModal";

import {
  createGiftCard,
  deleteGiftCard,
  subscribeToGiftCards,
  updateGiftCard,
} from "../services/giftCardService";

import { formatDate } from "../utils/dateUtils";

import {
  formatMoney,
  getGiftCardStatus,
  sumTransactions,
  toCents,
} from "../utils/giftCardUtils";

function GiftCardsPage() {
  const [cards, setCards] = useState(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [editingCard, setEditingCard] =
    useState(null);

  const [detailCardId, setDetailCardId] =
    useState(null);

  /*
    Listens rather than loads, so a redemption made at
    another front-desk computer or from a scan shows up
    here straight away.
  */
  useEffect(
    () =>
      subscribeToGiftCards(
        (results) => {
          setCards(results);
          setError("");
          setLoading(false);
        },
        (loadError) => {
          console.error(
            "Unable to load gift cards:",
            loadError
          );

          setError(
            loadError?.code ===
              "permission-denied"
              ? "Firebase refused access to gift cards. The Firestore rules need to allow staff to use the giftCards and counters collections."
              : "Unable to load gift cards from Firebase."
          );

          setLoading(false);
        }
      ),
    []
  );

  const totals = useMemo(() => {
    let soldCents = 0;
    let redeemedCents = 0;
    let outstandingCents = 0;
    let activeCount = 0;

    for (const card of cards) {
      soldCents +=
        toCents(card.originalValue) +
        toCents(
          sumTransactions(
            card.transactions,
            "reload"
          )
        );

      redeemedCents += toCents(
        sumTransactions(
          card.transactions,
          "redeem"
        )
      );

      outstandingCents += toCents(
        card.currentBalance
      );

      if (
        getGiftCardStatus(card) ===
        "active"
      ) {
        activeCount += 1;
      }
    }

    return {
      sold: soldCents / 100,
      redeemed: redeemedCents / 100,
      outstanding:
        outstandingCents / 100,
      activeCount,
    };
  }, [cards]);

  const filteredCards = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return cards;
    }

    return cards.filter((card) =>
      [
        card.giftCardId,
        card.purchaserName,
        card.purchaserEmail,
        card.recipientName,
        card.recipientEmail,
        card.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [cards, search]);

  const cardGroups = useMemo(() => {
    const active = [];
    const redeemed = [];

    filteredCards.forEach((card) => {
      if (
        getGiftCardStatus(card) ===
        "active"
      ) {
        active.push(card);
      } else {
        redeemed.push(card);
      }
    });

    return [
      {
        key: "active",
        label: "Active",
        cards: active,
      },
      {
        key: "redeemed",
        label: "Fully Redeemed",
        cards: redeemed,
      },
    ];
  }, [filteredCards]);

  async function handleCreate(form) {
    const cardId =
      await createGiftCard(form);

    setShowAddForm(false);

    /*
      Opening the new card straight away puts the
      email and print buttons in front of staff while
      the buyer is still at the desk.
    */
    setDetailCardId(cardId);
  }

  async function handleUpdate(form) {
    await updateGiftCard(
      editingCard.id,
      form
    );

    setEditingCard(null);
  }

  async function handleDelete(card) {
    const balanceWarning =
      toCents(card.currentBalance) > 0
        ? ` It still has ${formatMoney(
            card.currentBalance
          )} on it.`
        : "";

    const confirmed = window.confirm(
      `Delete gift card ${card.giftCardId} for ${card.recipientName}?${balanceWarning} This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await deleteGiftCard(card.id);
    } catch (deleteError) {
      console.error(
        "Unable to delete gift card:",
        deleteError
      );

      setError(
        "Unable to delete this gift card."
      );
    }
  }

  return (
    <div className="page">
      <header className="page-header page-header-actions">
        <div>
          <span className="eyebrow">
            Wings Arena
          </span>

          <h1>Gift Cards</h1>

          <p>
            Issue gift cards, track their
            balances and record purchases
            made with them.
          </p>
        </div>

        <button
          type="button"
          className="primary-button page-add-member"
          onClick={() =>
            setShowAddForm(true)
          }
        >
          <Gift size={20} />
          Add Gift Card
        </button>
      </header>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      <section className="stats-grid gift-card-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Gift size={22} />
          </div>

          <div>
            <span>Active Cards</span>

            <strong>
              {loading
                ? "—"
                : totals.activeCount}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CircleDollarSign
              size={22}
            />
          </div>

          <div>
            <span>Total Sold</span>

            <strong>
              {loading
                ? "—"
                : formatMoney(
                    totals.sold
                  )}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Receipt size={22} />
          </div>

          <div>
            <span>Total Redeemed</span>

            <strong>
              {loading
                ? "—"
                : formatMoney(
                    totals.redeemed
                  )}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Wallet size={22} />
          </div>

          <div>
            <span>
              Outstanding Balance
            </span>

            <strong>
              {loading
                ? "—"
                : formatMoney(
                    totals.outstanding
                  )}
            </strong>
          </div>
        </div>
      </section>

      <section className="content-card">
        <div className="member-toolbar">
          <div className="search-box">
            <Search size={19} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search by card number, name or email..."
            />
          </div>

          <div className="member-count">
            {loading
              ? "Loading..."
              : `${filteredCards.length} ${
                  filteredCards.length ===
                  1
                    ? "gift card"
                    : "gift cards"
                }`}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Gift Card ID</th>
                <th>Recipient</th>
                <th>Purchaser</th>
                <th className="money-column">
                  Original Value
                </th>
                <th className="money-column">
                  Current Balance
                </th>
                <th>Date Issued</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan="8"
                    className="empty-table-cell"
                  >
                    Loading gift cards from
                    Firebase...
                  </td>
                </tr>
              )}

              {!loading &&
                cardGroups.map(
                  (group) =>
                    group.cards.length >
                      0 && (
                      <Fragment
                        key={group.key}
                      >
                        <tr className="table-group-row">
                          <td colSpan="8">
                            <span className="table-group-label">
                              {group.label}
                            </span>

                            <span className="table-group-count">
                              {
                                group.cards
                                  .length
                              }
                            </span>
                          </td>
                        </tr>

                        {group.cards.map(
                          (card) => {
                            const status =
                              getGiftCardStatus(
                                card
                              );

                            return (
                              <tr
                                key={
                                  card.id
                                }
                              >
                                <td>
                                  <button
                                    type="button"
                                    className="gift-card-id-button"
                                    onClick={() =>
                                      setDetailCardId(
                                        card.id
                                      )
                                    }
                                    title="Open this gift card"
                                  >
                                    <code className="qr-token">
                                      {
                                        card.giftCardId
                                      }
                                    </code>
                                  </button>
                                </td>

                                <td>
                                  <strong className="gift-card-name">
                                    {
                                      card.recipientName
                                    }
                                  </strong>

                                  {card.recipientEmail && (
                                    <span className="gift-card-subtext">
                                      {
                                        card.recipientEmail
                                      }
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <span className="gift-card-name">
                                    {
                                      card.purchaserName
                                    }
                                  </span>

                                  {card.purchaserEmail && (
                                    <span className="gift-card-subtext">
                                      {
                                        card.purchaserEmail
                                      }
                                    </span>
                                  )}
                                </td>

                                <td className="money-column">
                                  {formatMoney(
                                    card.originalValue
                                  )}
                                </td>

                                <td
                                  className={`money-column gift-card-balance ${status}`}
                                >
                                  {formatMoney(
                                    card.currentBalance
                                  )}
                                </td>

                                <td>
                                  {formatDate(
                                    card.dateIssued
                                  )}
                                </td>

                                <td>
                                  <span
                                    className={`membership-badge ${status}`}
                                  >
                                    {status ===
                                    "active"
                                      ? "Active"
                                      : "Fully Redeemed"}
                                  </span>
                                </td>

                                <td>
                                  <div className="row-actions">
                                    <button
                                      type="button"
                                      className="icon-button"
                                      title="Redeem, send or print"
                                      onClick={() =>
                                        setDetailCardId(
                                          card.id
                                        )
                                      }
                                    >
                                      <Wallet
                                        size={
                                          18
                                        }
                                      />
                                    </button>

                                    <button
                                      type="button"
                                      className="icon-button"
                                      title="Edit gift card"
                                      onClick={() =>
                                        setEditingCard(
                                          card
                                        )
                                      }
                                    >
                                      <Edit3
                                        size={
                                          18
                                        }
                                      />
                                    </button>

                                    <button
                                      type="button"
                                      className="icon-button danger"
                                      title="Delete gift card"
                                      onClick={() =>
                                        handleDelete(
                                          card
                                        )
                                      }
                                    >
                                      <Trash2
                                        size={
                                          18
                                        }
                                      />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </Fragment>
                    )
                )}

              {!loading &&
                filteredCards.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="empty-table-cell"
                    >
                      {search
                        ? "No gift cards match your search."
                        : "No gift cards have been issued yet."}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddForm && (
        <GiftCardFormModal
          onClose={() =>
            setShowAddForm(false)
          }
          onSave={handleCreate}
        />
      )}

      {editingCard && (
        <GiftCardFormModal
          card={editingCard}
          onClose={() =>
            setEditingCard(null)
          }
          onSave={handleUpdate}
        />
      )}

      {detailCardId && (
        <GiftCardDetailModal
          key={detailCardId}
          cardId={detailCardId}
          onClose={() =>
            setDetailCardId(null)
          }
          onEdit={(card) => {
            setDetailCardId(null);
            setEditingCard(card);
          }}
        />
      )}
    </div>
  );
}

export default GiftCardsPage;
