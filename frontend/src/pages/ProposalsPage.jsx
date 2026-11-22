// Teklif listeleme, güncelleme teklifi oluşturma ve onay/red aksiyonlarını yönetmek için hook'lar
import { useEffect, useState } from "react";
// Yetkisiz (401) durumda /login yönlendirmesi için useNavigate
import { useNavigate } from "react-router-dom";
// localStorage'daki access_token'ı otomatik ekleyen ortak API istemcisi
import { apiRequest } from "../api/client";
// Üst Navbar ve sol Sidebar'ı bir arada sunan ortak yerleşim kabuğu
import MainLayout from "../components/MainLayout";
// Ortak koyu lacivert + kum/altın tema ve bileşen stilleri
import "../styles/auth.css";
import "../styles/tasks.css";

// ISO tarih string'ini okunabilir Türkçe tarihe çevirir
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

// Teklif durumunu (pending / approved / rejected) okunabilir Türkçe etikete çevirir
function getStatusLabel(status) {
  switch (status) {
    case "approved":
      return "Onaylandı";
    case "rejected":
      return "Reddedildi";
    case "pending":
    default:
      return "Beklemede";
  }
}

// JWT access_token payload'ını güvenli şekilde decode eder
function parseJwtPayload(token) {
  if (!token) return {};
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

export default function ProposalsPage() {
  // GET /api/proposals/ yanıtı (kendi gönderdiğimiz teklifler + sahibi olduğumuz görevlere gelen teklifler)
  const [proposals, setProposals] = useState([]);
  // Görevler listesi (GET /api/tasks/ üzerinden çekilir)
  const [tasks, setTasks] = useState([]);

  // Yeni güncelleme teklifi oluşturma formu state'leri
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [proposedTitle, setProposedTitle] = useState("");
  const [proposedDescription, setProposedDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Onay/Red işlemi sürerken ilgili teklifin ID'sini tutar
  const [respondingProposalId, setRespondingProposalId] = useState(null);

  // Aktif oturumdaki kullanıcı bilgisi (localStorage ve JWT payload üzerinden okunur)
  const tokenPayload = parseJwtPayload(localStorage.getItem("access_token") || "");
  const currentUsername = (
    localStorage.getItem("username") ||
    tokenPayload.username ||
    ""
  ).trim();
  const currentUserId = String(
    localStorage.getItem("user_id") ||
      tokenPayload.user_id ||
      tokenPayload.sub ||
      ""
  ).trim();

  // Yüklenme, hata ve başarılı işlem geri bildirim mesajları
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  // Verilen değerin mevcut kullanıcıyla (username veya user_id) eşleşip eşleşmediğini kontrol eder
  function matchesCurrentUser(value) {
    if (value === undefined || value === null || value === "") return false;
    if (typeof value === "object") {
      const objUsername = String(value.username || "").trim();
      const objId = String(value.id ?? "").trim();
      return (
        (currentUsername && objUsername === currentUsername) ||
        (currentUserId && objId === currentUserId)
      );
    }
    const strVal = String(value).trim();
    return (
      (currentUsername && strVal === currentUsername) ||
      (currentUserId && strVal === currentUserId)
    );
  }

  // Görev ID'sine göre görev nesnesini döndürür
  function getTaskById(taskId) {
    return tasks.find((t) => String(t.id) === String(taskId)) || null;
  }

  // Görevin bize atanıp atanmadığını ve KESİNLİKLE sahibi olmadığımızı kontrol eder
  function isAssignedToMe(task) {
    if (!task) return false;

    // 1. Sahibi bizsek kesinlikle listeye girmez
    const isOwner = [
      task.owner_username,
      task.owner,
      task.owner_id,
      task.created_by,
    ].some((cand) => matchesCurrentUser(cand));

    if (isOwner) {
      return false;
    }

    // 2. assigned_to alanı varsa birebir kontrol et
    if (task.assigned_to_username !== undefined) {
      return matchesCurrentUser(task.assigned_to_username);
    }
    if (task.assigned_to_id !== undefined) {
      return matchesCurrentUser(task.assigned_to_id);
    }
    if (task.assigned_to !== undefined) {
      if (Array.isArray(task.assigned_to)) {
        return task.assigned_to.some((item) => matchesCurrentUser(item));
      }
      return matchesCurrentUser(task.assigned_to);
    }

    // 3. TaskSerializer'da assigned_to serialize edilmemişse, TaskViewSet.get_queryset()
    // (Q(owner=user) | Q(assigned_to=user)) gereği owner olmadığımız görev bize atanmıştır
    return true;
  }

  // Teklifleri ve görevleri birlikte yükleyen yardımcı fonksiyon
  async function loadProposalsAndTasks(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const [proposalsRes, tasksRes] = await Promise.all([
        apiRequest("/proposals/", { method: "GET" }),
        apiRequest("/tasks/", { method: "GET" }),
      ]);

      if (proposalsRes.status === 401 || tasksRes.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const proposalsData = await proposalsRes.json().catch(() => []);
      const tasksData = await tasksRes.json().catch(() => []);

      if (!proposalsRes.ok) {
        setErrorMessage(
          proposalsData.detail ||
            proposalsData.error ||
            "Teklifler yüklenirken bir hata oluştu."
        );
        return;
      }

      const proposalList = Array.isArray(proposalsData)
        ? proposalsData
        : proposalsData.results || [];
      setProposals(proposalList);

      if (tasksRes.ok) {
        const taskList = Array.isArray(tasksData)
          ? tasksData
          : tasksData.results || [];
        setTasks(taskList);

        // Yalnızca bize atanmış ve sahibi olmadığımız görevler
        const assignableTasks = taskList.filter(isAssignedToMe);
        if (assignableTasks.length > 0) {
          setSelectedTaskId((prev) => {
            const stillValid = assignableTasks.some(
              (t) => String(t.id) === String(prev)
            );
            return stillValid ? prev : String(assignableTasks[0].id);
          });
        } else {
          setSelectedTaskId("");
        }
      }
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    loadProposalsAndTasks(true);
  }, [navigate]);

  // Görev ID'sine göre görev başlığını döndürür
  function getTaskTitle(taskId) {
    const found = getTaskById(taskId);
    return found ? found.title : `Görev #${taskId}`;
  }

  // Görev ID'sine göre görevin sahibini döndürür
  function getTaskOwnerUsername(taskId) {
    const found = getTaskById(taskId);
    if (!found) return "";
    if (found.owner_username) return found.owner_username;
    if (typeof found.owner === "object" && found.owner !== null) {
      return found.owner.username || "";
    }
    return typeof found.owner === "string" ? found.owner : "";
  }

  // Mevcut kullanıcının ilgili görevin sahibi olup olmadığını username ve id ile kontrol eder
  function isCurrentUserTaskOwner(taskId) {
    const found = getTaskById(taskId);
    if (!found) return false;
    return [
      found.owner_username,
      found.owner,
      found.owner_id,
      found.created_by,
    ].some((cand) => matchesCurrentUser(cand));
  }

  // Yeni güncelleme teklifi gönderir: POST /api/proposals/
  async function handleCreateProposal(e) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedTaskId) {
      setErrorMessage("Lütfen teklif göndermek için sana atanmış bir görev seç.");
      return;
    }

    setIsCreating(true);

    try {
      const payload = {
        task: Number(selectedTaskId),
        title: proposedTitle.trim(),
        description: proposedDescription.trim(),
      };

      const response = await apiRequest("/proposals/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const firstFieldError =
          data.detail ||
          data.error ||
          data.task?.[0] ||
          data.non_field_errors?.[0] ||
          "Teklif gönderilemedi.";
        setErrorMessage(firstFieldError);
        return;
      }

      setSuccessMessage("Güncelleme teklifi başarıyla gönderildi.");
      setProposedTitle("");
      setProposedDescription("");
      await loadProposalsAndTasks(false);
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setIsCreating(false);
    }
  }

  // Görev sahibi teklifi onaylar ('approve') veya reddeder ('reject'): POST /api/proposals/<id>/respond/
  async function handleRespondProposal(proposalId, action) {
    setErrorMessage("");
    setSuccessMessage("");
    setRespondingProposalId(proposalId);

    try {
      const response = await apiRequest(`/proposals/${proposalId}/respond/`, {
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
          data.detail ||
            data.error ||
            "Teklif yanıtlanırken bir hata oluştu."
        );
        return;
      }

      setSuccessMessage(
        data.detail ||
          (action === "approve"
            ? "Teklif onaylandı ve görev güncellendi."
            : "Teklif reddedildi.")
      );

      await loadProposalsAndTasks(false);
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setRespondingProposalId(null);
    }
  }

  // Sadece bize atanmış (assigned_to) ve owner olmadığımız görevler
  const candidateTasks = tasks.filter(isAssignedToMe);

  return (
    <MainLayout>
      <div className="tasks-container">
        {/* Üst Başlık */}
        <div className="tasks-header">
          <h1>Teklifler</h1>
          {!isLoading && (
            <span className="tasks-count">{proposals.length} Teklif</span>
          )}
        </div>

        {/* Yeni Güncelleme Teklifi Oluşturma Formu */}
        <div className="tasks-filter-panel">
          <h2 className="task-title" style={{ marginBottom: "6px" }}>
            Atandığın Görev İçin Güncelleme Teklifi Gönder
          </h2>
          <p
            style={{
              margin: "0 0 14px 0",
              fontSize: "0.86rem",
              color: "#94a3b8",
            }}
          >
            Sahibi olduğun görevler burada görünmez; yalnızca başkasının oluşturup
            sana atadığı görevler listelenir.
          </p>

          <form
            onSubmit={handleCreateProposal}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div className="task-edit-grid">
              <div className="task-edit-field">
                <label htmlFor="proposal-task-select">Atanan Görev</label>
                <select
                  id="proposal-task-select"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  disabled={candidateTasks.length === 0}
                >
                  {candidateTasks.length === 0 ? (
                    <option value="">
                      Sana atanmış başka görev bulunmuyor
                    </option>
                  ) : (
                    candidateTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                        {t.owner_username ? ` (Sahip: ${t.owner_username})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="task-edit-field">
                <label htmlFor="proposal-title-input">
                  Önerilen Yeni Başlık (Boş bırakılırsa mevcut başlık korunur)
                </label>
                <input
                  id="proposal-title-input"
                  type="text"
                  placeholder="Yeni görev başlığı..."
                  value={proposedTitle}
                  onChange={(e) => setProposedTitle(e.target.value)}
                  disabled={candidateTasks.length === 0}
                />
              </div>
            </div>

            <div className="task-edit-field">
              <label htmlFor="proposal-desc-input">Önerilen Açıklama</label>
              <textarea
                id="proposal-desc-input"
                rows="3"
                placeholder="Görevde yapılmasını önerdiğin değişiklikleri yaz..."
                value={proposedDescription}
                onChange={(e) => setProposedDescription(e.target.value)}
                disabled={candidateTasks.length === 0}
              />
            </div>

            <div className="task-edit-actions">
              <button
                type="submit"
                className="task-btn-sm task-btn-save"
                style={{ padding: "9px 16px", fontSize: "0.86rem" }}
                disabled={isCreating || candidateTasks.length === 0}
              >
                {isCreating ? "Gönderiliyor..." : "Teklif Gönder"}
              </button>
            </div>
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
        {isLoading && <p>Teklifler yükleniyor...</p>}

        {/* Teklif Listesi */}
        {!isLoading && (
          <div className="task-list">
            {proposals.length === 0 ? (
              <p>Henüz görüntülenebilecek bir güncelleme teklifi yok.</p>
            ) : (
              proposals.map((proposal) => {
                const taskOwner = getTaskOwnerUsername(proposal.task);
                const isOwner = isCurrentUserTaskOwner(proposal.task);
                const isPending =
                  String(proposal.status || "").trim().toLowerCase() ===
                  "pending";
                const isResponding = respondingProposalId === proposal.id;

                return (
                  <article key={proposal.id} className="task-card">
                    <div className="task-card-top">
                      <h3 className="task-title">
                        {proposal.title || getTaskTitle(proposal.task)}
                      </h3>

                      <div className="task-badges">
                        <span className="task-badge badge-category">
                          {getTaskTitle(proposal.task)}
                        </span>
                        <span className="task-badge badge-status">
                          {getStatusLabel(proposal.status)}
                        </span>
                      </div>
                    </div>

                    {proposal.description && (
                      <p className="task-description">{proposal.description}</p>
                    )}

                    <div className="task-footer">
                      <div className="task-meta">
                        <span>
                          Teklif Eden: <strong>{proposal.proposed_by}</strong>
                        </span>
                        {taskOwner && (
                          <span>
                            Görev Sahibi: <strong>{taskOwner}</strong>
                          </span>
                        )}
                        {proposal.created_at && (
                          <span>Tarih: {formatDate(proposal.created_at)}</span>
                        )}
                      </div>

                      {/* Sadece görev sahibi ve beklemede ('pending') teklifler için Onayla / Reddet */}
                      {isOwner && isPending && (
                        <div className="task-actions">
                          <button
                            type="button"
                            className="task-btn-sm task-btn-save"
                            disabled={isResponding}
                            onClick={() =>
                              handleRespondProposal(proposal.id, "approve")
                            }
                          >
                            {isResponding ? "..." : "Onayla"}
                          </button>
                          <button
                            type="button"
                            className="task-btn-sm task-btn-delete"
                            disabled={isResponding}
                            onClick={() =>
                              handleRespondProposal(proposal.id, "reject")
                            }
                          >
                            {isResponding ? "..." : "Reddet"}
                          </button>
                        </div>
                      )}
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