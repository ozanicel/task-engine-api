// Arkadaş listesi, gelen istekler, istek gönderme formu ve yanıt aksiyonlarını yönetmek için hook'ları alıyoruz
import { useEffect, useState } from "react";
// Yetkisiz (401) durumda /login ekranına yönlendirmek için useNavigate kullanıyoruz
import { useNavigate } from "react-router-dom";
// localStorage'daki access_token'ı otomatik Bearer header olarak ekleyen ortak API yardımcısı
import { apiRequest } from "../api/client";
// Üst Navbar ve sol Sidebar'ı bir arada sunan ortak yerleşim kabuğu
import MainLayout from "../components/MainLayout";
// Ortak hata mesajı stili ve kart/buton/form stilleri
import "../styles/auth.css";
import "../styles/tasks.css";

// ISO tarih string'ini okunabilir Türkçe tarih formatına çevirir
function formatDate(dateValue) {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FriendsPage() {
  // Kabul edilmiş arkadaş kullanıcı adları listesi (GET /friends/list/)
  const [friends, setFriends] = useState([]);
  // Gelen bekleyen arkadaşlık istekleri (GET /friends/requests/)
  const [incomingRequests, setIncomingRequests] = useState([]);

  // Yeni arkadaşlık isteği gönderme formu state'leri
  const [targetUsername, setTargetUsername] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Kabul/Red isteği sürerken ilgili isteğin ID'sini tutar
  const [respondingRequestId, setRespondingRequestId] = useState(null);

  // Yüklenme, hata ve başarılı işlem geri bildirim mesajları
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  // Arkadaş listesini ve gelen bekleyen istekleri birlikte çeken yardımcı fonksiyon
  async function loadFriendsData(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const [friendsRes, requestsRes] = await Promise.all([
        apiRequest("/friends/list/", { method: "GET" }),
        apiRequest("/friends/requests/", { method: "GET" }),
      ]);

      // Token geçersiz veya süresi dolmuşsa giriş ekranına yönlendiriyoruz
      if (friendsRes.status === 401 || requestsRes.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const friendsData = await friendsRes.json().catch(() => ({}));
      const requestsData = await requestsRes.json().catch(() => []);

      if (!friendsRes.ok) {
        setErrorMessage(
          friendsData.error ||
            friendsData.detail ||
            "Arkadaş listesi yüklenirken bir hata oluştu."
        );
        return;
      }

      if (!requestsRes.ok) {
        setErrorMessage(
          requestsData.error ||
            requestsData.detail ||
            "Arkadaşlık istekleri yüklenirken bir hata oluştu."
        );
        return;
      }

      // list_friends {"friends": [...]} yapısında yanıt döner
      const friendList = Array.isArray(friendsData.friends)
        ? friendsData.friends
        : Array.isArray(friendsData)
          ? friendsData
          : [];
      setFriends(friendList);

      // list_friend_requests doğrudan dizi veya paginated sonuç dönebilir
      const requestList = Array.isArray(requestsData)
        ? requestsData
        : requestsData.results || [];
      setIncomingRequests(requestList);
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }

  // Sayfa ilk açıldığında verileri yüklüyoruz
  useEffect(() => {
    loadFriendsData(true);
  }, [navigate]);

  // Kullanıcı adına arkadaşlık isteği göndermek için POST /friends/send/ isteği atar
  async function handleSendRequest(e) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedUsername = targetUsername.trim();
    if (!trimmedUsername) {
      setErrorMessage("Lütfen bir kullanıcı adı gir.");
      return;
    }

    setIsSending(true);

    try {
      const response = await apiRequest("/friends/send/", {
        method: "POST",
        body: JSON.stringify({ username: trimmedUsername }),
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(
          data.error ||
            data.detail ||
            "Arkadaşlık isteği gönderilemedi."
        );
        return;
      }

      setSuccessMessage(
        data.message || `${trimmedUsername} kullanıcısına arkadaşlık isteği gönderildi.`
      );
      setTargetUsername("");
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setIsSending(false);
    }
  }

  // Gelen arkadaşlık isteğini kabul ('accept') veya reddet ('reject') eder
  async function handleRespondRequest(requestId, action) {
    setErrorMessage("");
    setSuccessMessage("");
    setRespondingRequestId(requestId);

    try {
      const response = await apiRequest(`/friends/respond/${requestId}/`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(
          data.error ||
            data.detail ||
            "İstek yanıtlanırken bir hata oluştu."
        );
        return;
      }

      setSuccessMessage(
        data.message ||
          (action === "accept"
            ? "Arkadaşlık isteği kabul edildi."
            : "Arkadaşlık isteği reddedildi.")
      );

      // Kabul veya red sonrası gelen istekler ve arkadaş listesini güncel tutuyoruz
      await loadFriendsData(false);
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setRespondingRequestId(null);
    }
  }

  return (
    <MainLayout>
      <div className="tasks-container">
        {/* Üst Başlık */}
        <div className="tasks-header">
          <h1>Arkadaşlar</h1>
          {!isLoading && (
            <span className="tasks-count">{friends.length} Arkadaş</span>
          )}
        </div>

        {/* Arkadaşlık İsteği Gönderme Formu */}
        <div className="tasks-filter-panel">
          <form
            onSubmit={handleSendRequest}
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div className="task-edit-field" style={{ flex: 1, minWidth: "220px" }}>
              <label htmlFor="friend-target-username">
                Kullanıcı Adı ile Arkadaşlık İsteği Gönder
              </label>
              <input
                id="friend-target-username"
                type="text"
                placeholder="......"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="task-btn-sm task-btn-save"
              style={{ padding: "9px 16px", fontSize: "0.86rem" }}
              disabled={isSending}
            >
              {isSending ? "Gönderiliyor..." : "İstek Gönder"}
            </button>
          </form>
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
        {isLoading && <p>Arkadaşlar ve istekler yükleniyor...</p>}

        {!isLoading && (
          <>
            {/* Gelen Arkadaşlık İstekleri Bölümü */}
            <div className="task-card" style={{ gap: "14px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 className="task-title">Gelen İstekler</h2>
                <span className="task-badge badge-status">
                  {incomingRequests.length} Bekleyen
                </span>
              </div>

              {incomingRequests.length === 0 ? (
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
                  Şu anda bekleyen arkadaşlık isteğin bulunmuyor.
                </p>
              ) : (
                <ul className="task-list">
                  {incomingRequests.map((req) => {
                    const isResponding = respondingRequestId === req.id;
                    const senderLabel =
                      req.sender_username || `Kullanıcı #${req.sender}`;

                    return (
                      <li
                        key={req.id}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "10px",
                          backgroundColor: "#0b1220",
                          border: "1px solid rgba(148, 163, 184, 0.18)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                            {senderLabel}
                          </span>
                          {req.created_at && (
                            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                              Tarih: {formatDate(req.created_at)}
                            </span>
                          )}
                        </div>

                        <div className="task-actions">
                          <button
                            type="button"
                            className="task-btn-sm task-btn-save"
                            disabled={isResponding}
                            onClick={() => handleRespondRequest(req.id, "accept")}
                          >
                            {isResponding ? "..." : "Kabul Et"}
                          </button>
                          <button
                            type="button"
                            className="task-btn-sm task-btn-delete"
                            disabled={isResponding}
                            onClick={() => handleRespondRequest(req.id, "reject")}
                          >
                            {isResponding ? "..." : "Reddet"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Arkadaş Listesi Bölümü */}
            <div className="task-card" style={{ gap: "14px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 className="task-title">Arkadaş Listesi</h2>
                <span className="task-badge badge-category">
                  {friends.length} Kişi
                </span>
              </div>

              {friends.length === 0 ? (
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
                  Henüz arkadaşın yok. Yukarıdan kullanıcı adı girerek istek gönderebilirsin.
                </p>
              ) : (
                <ul className="task-list">
                  {friends.map((friendUsername) => (
                    <li
                      key={friendUsername}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        backgroundColor: "#0b1220",
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                        {friendUsername}
                      </span>
                      <span className="task-badge badge-status">Arkadaş</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}