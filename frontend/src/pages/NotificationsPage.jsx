// Bildirimleri listeleme, filtreleme ve okundu işaretleme işlemleri için hook'lar
import { useEffect, useState } from "react";
// Yetkisiz (401) durumda /login yönlendirmesi için useNavigate
import { useNavigate } from "react-router-dom";
// localStorage'daki access_token'ı otomatik ekleyen ortak API istemcisi
import { apiRequest } from "../api/client";
// Üst Navbar ve sol Sidebar'ı bir arada sunan ortak yerleşim kabuğu
import MainLayout from "../components/MainLayout";
// Ortak tema ve bileşen stilleri
import "../styles/auth.css";
import "../styles/tasks.css";

// ISO tarih string'ini okunabilir Türkçe tarih ve saat formatına çevirir
function formatDateTime(dateValue) {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Backend notification_type değerini okunabilir Türkçe kategori etiketine çevirir
function getNotificationTypeLabel(type) {
  switch (type) {
    case "friend_request":
      return "Arkadaşlık İsteği";
    case "task_update_request":
      return "Güncelleme Teklifi";
    case "task_proposal_approved":
      return "Teklif Onaylandı";
    case "task_proposal_rejected":
      return "Teklif Reddedildi";
    default:
      return type || "Bildirim";
  }
}

export default function NotificationsPage() {
  // GET /api/notifications/ yanıtından gelen bildirim listesi
  const [notifications, setNotifications] = useState([]);
  // Filtre sekmesi: "all" (Tümü) veya "unread" (Okunmamış)
  const [filterMode, setFilterMode] = useState("all");

  // Tekil okundu işlemi süren bildirimin ID'si ve toplu okundu durumu
  const [updatingId, setUpdatingId] = useState(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Yüklenme, hata ve başarılı işlem mesajları
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  // Bildirimleri backend'den çeken yardımcı fonksiyon
  async function loadNotifications(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const response = await apiRequest("/notifications/", { method: "GET" });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        setErrorMessage(
          data.detail ||
            data.error ||
            "Bildirimler yüklenirken bir hata oluştu."
        );
        return;
      }

      const list = Array.isArray(data) ? data : data.results || [];
      setNotifications(list);
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    loadNotifications(true);
  }, [navigate]);

  // Tek bir bildirimi okundu (veya okunmadı) olarak işaretler: PATCH /api/notifications/<id>/
  async function handleToggleRead(notification) {
    setErrorMessage("");
    setSuccessMessage("");
    setUpdatingId(notification.id);

    const nextIsRead = !notification.is_read;

    try {
      const response = await apiRequest(`/notifications/${notification.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_read: nextIsRead }),
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(
          data.detail ||
            data.error ||
            "Bildirim durumu güncellenirken bir hata oluştu."
        );
        return;
      }

      // Yerel state'i anında güncelliyoruz
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: nextIsRead } : item
        )
      );
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setUpdatingId(null);
    }
  }

  // Okunmamış tüm bildirimleri tek seferde okundu olarak işaretler
  async function handleMarkAllAsRead() {
    const unreadItems = notifications.filter((n) => !n.is_read);
    if (unreadItems.length === 0) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsMarkingAll(true);

    try {
      const results = await Promise.all(
        unreadItems.map((item) =>
          apiRequest(`/notifications/${item.id}/`, {
            method: "PATCH",
            body: JSON.stringify({ is_read: true }),
          })
        )
      );

      if (results.some((res) => res.status === 401)) {
        navigate("/login", { replace: true });
        return;
      }

      const anyFailed = results.some((res) => !res.ok);
      if (anyFailed) {
        setErrorMessage("Bazı bildirimler güncellenemedi.");
        await loadNotifications(false);
        return;
      }

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
      setSuccessMessage("Tüm bildirimler okundu olarak işaretlendi.");
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setIsMarkingAll(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const visibleNotifications =
    filterMode === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <MainLayout>
      <div className="tasks-container">
        {/* Üst Başlık ve Okunmamış Sayacı */}
        <div className="tasks-header">
          <h1>Bildirimler</h1>
          {!isLoading && (
            <span className="tasks-count">{unreadCount} Okunmamış</span>
          )}
        </div>

        {/* Filtre ve Toplu Aksiyon Paneli */}
        <div
          className="tasks-filter-panel"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div className="task-actions">
            <button
              type="button"
              className={`task-btn-sm ${
                filterMode === "all" ? "task-btn-save" : "task-btn-cancel"
              }`}
              onClick={() => setFilterMode("all")}
            >
              Tümü ({notifications.length})
            </button>
            <button
              type="button"
              className={`task-btn-sm ${
                filterMode === "unread" ? "task-btn-save" : "task-btn-cancel"
              }`}
              onClick={() => setFilterMode("unread")}
            >
              Okunmamış ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="task-btn-sm task-btn-edit"
              disabled={isMarkingAll}
              onClick={handleMarkAllAsRead}
            >
              {isMarkingAll
                ? "İşaretleniyor..."
                : "Tümünü Okundu İşaretle"}
            </button>
          )}
        </div>

        {/* Başarılı işlem mesajı */}
        {successMessage && (
          <div
            className="task-card"
            style={{
              padding: "12px 18px",
              borderColor: "rgba(212, 175, 106, 0.45)",
              color: "#e2c285",
              fontSize: "0.9rem",
            }}
            role="status"
          >
            {successMessage}
          </div>
        )}

        {/* Hata mesajı */}
        {errorMessage && (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        )}

        {/* Yüklenme durumu */}
        {isLoading && <p>Bildirimler yükleniyor...</p>}

        {/* Bildirim Kartları Listesi */}
        {!isLoading && (
          <div className="task-list">
            {visibleNotifications.length === 0 ? (
              <p>
                {filterMode === "unread"
                  ? "Okunmamış bildirimin bulunmuyor."
                  : "Henüz hiç bildirimin yok."}
              </p>
            ) : (
              visibleNotifications.map((notification) => {
                const isUpdating = updatingId === notification.id;
                const isUnread = !notification.is_read;

                return (
                  <article
                    key={notification.id}
                    className="task-card"
                    style={{
                      borderColor: isUnread
                        ? "rgba(212, 175, 106, 0.55)"
                        : "rgba(148, 163, 184, 0.18)",
                      opacity: isUnread ? 1 : 0.78,
                    }}
                  >
                    <div className="task-card-top">
                      <h3 className="task-title">
                        {notification.title || "Bildirim"}
                      </h3>

                      <div className="task-badges">
                        <span className="task-badge badge-category">
                          {getNotificationTypeLabel(
                            notification.notification_type
                          )}
                        </span>
                        <span className="task-badge badge-status">
                          {isUnread ? "Yeni" : "Okundu"}
                        </span>
                      </div>
                    </div>

                    {notification.message && (
                      <p className="task-description">{notification.message}</p>
                    )}

                    <div className="task-footer">
                      <div className="task-meta">
                        {notification.actor_username && (
                          <span>
                            Gönderen:{" "}
                            <strong>{notification.actor_username}</strong>
                          </span>
                        )}
                        {notification.created_at && (
                          <span>
                            Tarih: {formatDateTime(notification.created_at)}
                          </span>
                        )}
                      </div>

                      <div className="task-actions">
                        <button
                          type="button"
                          className={`task-btn-sm ${
                            isUnread ? "task-btn-save" : "task-btn-cancel"
                          }`}
                          disabled={isUpdating}
                          onClick={() => handleToggleRead(notification)}
                        >
                          {isUpdating
                            ? "..."
                            : isUnread
                              ? "Okundu İşaretle"
                              : "Okunmadı Yap"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}