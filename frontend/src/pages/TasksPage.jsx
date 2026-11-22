// Görev listesi, kategori seçenekleri, arama/filtre ve düzenleme durumlarını yönetmek için hook'ları alıyoruz
import { useEffect, useState } from "react";
// Yetkisiz (401) durumda kullanıcıyı /login ekranına yönlendirmek için useNavigate kullanıyoruz
import { useNavigate } from "react-router-dom";
// localStorage'daki access_token'ı otomatik Bearer header olarak ekleyen ortak API yardımcısı
import { apiRequest } from "../api/client";
// Üst Navbar ve sol Sidebar'ı bir arada sunan ortak yerleşim kabuğu
import MainLayout from "../components/MainLayout";
// Ortak hata mesajı stili ve görev kartı stilleri
import "../styles/auth.css";
import "../styles/tasks.css";

// ISO tarih string'ini okunabilir Türkçe tarih formatına çevirir
function formatDate(dateValue) {
  if (!dateValue) return "Belirtilmemiş";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// <input type="date"> için YYYY-MM-DD formatı üretir
function toDateInputValue(dateValue) {
  if (!dateValue) return "";
  return String(dateValue).slice(0, 10);
}

// Oturumdaki kullanıcının kullanıcı adını/ID'sini token veya kayıtlı kullanıcı bilgisinden okumaya çalışır
function getCurrentUserIdentifier() {
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return parsed.username || parsed.id || null;
    }
  } catch {
    // JSON parse hatası olursa yok sayıyoruz
  }

  const token =
    localStorage.getItem("access_token") || localStorage.getItem("access");
  if (!token || token.split(".").length !== 3) return null;

  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return decoded.username || decoded.user_id || decoded.id || null;
  } catch {
    return null;
  }
}

export default function TasksPage() {
  // Backend'den çekilen görevler ve kategori seçenekleri
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);

  // Arama, durum filtresi ve sıralama durumları (TaskViewSet ile uyumlu)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ordering, setOrdering] = useState("-created_at");

  // Sayfa yüklenme ve hata durumları
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Kart içi düzenleme (Edit) için aktif görev ID'si ve form verisi
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    due_date: "",
    category: "",
  });

  // Kaydetme veya silme isteği sürerken ilgili görev ID'sini tutar
  const [busyTaskId, setBusyTaskId] = useState(null);

  const navigate = useNavigate();
  const currentUserId = getCurrentUserIdentifier();

  // Görev sahibinin (owner) mevcut kullanıcı olup olmadığını kontrol eder
  function isTaskOwner(task) {
    if (task.owner === undefined || task.owner === null) return true;
    if (currentUserId === null) return true;
    return String(task.owner) === String(currentUserId);
  }

  // Filtre, arama veya sıralama değiştiğinde /tasks/ endpoint'inden görevleri çeker
  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true);
      setErrorMessage("");

      // Query parametrelerini TaskViewSet filter_backends ile uyumlu şekilde oluşturuyoruz
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (ordering) params.set("ordering", ordering);

      const queryString = params.toString();
      const endpoint = queryString ? `/tasks/?${queryString}` : "/tasks/";

      try {
        const response = await apiRequest(endpoint, { method: "GET" });

        // Oturum süresi dolduysa giriş ekranına yönlendiriyoruz
        if (response.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        const data = await response.json().catch(() => []);
        if (!response.ok) {
          setErrorMessage(data.detail || "Görevler yüklenirken bir hata oluştu.");
          return;
        }

        // PageNumberPagination aktif olduğundan data.results veya düz dizi destekleniyor
        const taskList = Array.isArray(data) ? data : data.results || [];
        setTasks(taskList);
      } catch {
        setErrorMessage("Sunucuya bağlanılamadı.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, [navigate, searchQuery, statusFilter, ordering]);

  // Düzenleme formundaki kategori seçimi için kategorileri bir kez çekiyoruz
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await apiRequest("/categories/", { method: "GET" });
        if (res.ok) {
          const data = await res.json().catch(() => []);
          const list = Array.isArray(data) ? data : data.results || [];
          setCategories(list);
        }
      } catch {
        // Kategoriler yüklenemezse düzenleme formu "Kategorisiz" seçeneğiyle çalışır
      }
    }

    fetchCategories();
  }, []);

  // Bir kartta "Düzenle" butonuna basıldığında mevcut değerleri forma doldurur
  function startEditing(task) {
    setErrorMessage("");
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "TODO",
      priority: task.priority || "MEDIUM",
      due_date: toDateInputValue(task.due_date),
      category: task.category ?? "",
    });
  }

  // Düzenleme modundan iptal ederek çıkar
  function cancelEditing() {
    setEditingTaskId(null);
  }

  // Düzenlenen görevi PATCH isteğiyle backend'e kaydeder
  async function handleSaveEdit(e, taskId) {
    e.preventDefault();
    setBusyTaskId(taskId);
    setErrorMessage("");

    const payload = {
      title: editForm.title.trim(),
      description: editForm.description,
      status: editForm.status,
      priority: editForm.priority,
      due_date: editForm.due_date || null,
      category: editForm.category === "" ? null : Number(editForm.category),
    };

    try {
      const response = await apiRequest(`/tasks/${taskId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const updated = await response.json().catch(() => ({}));
      if (!response.ok) {
        // TaskViewSet.perform_update içindeki PermissionDenied mesajı burada yakalanır
        setErrorMessage(
          updated.detail ||
            "Görev güncellenemedi. Sadece sahibi olduğunuz görevleri doğrudan güncelleyebilirsiniz."
        );
        return;
      }

      setTasks((prev) => prev.map((item) => (item.id === taskId ? updated : item)));
      setEditingTaskId(null);
    } catch {
      setErrorMessage("Güncelleme sırasında sunucuya bağlanılamadı.");
    } finally {
      setBusyTaskId(null);
    }
  }

  // Görevi DELETE isteğiyle siler ve listeden kaldırır
  async function handleDeleteTask(task) {
    const confirmed = window.confirm(
      `"${task.title}" görevini silmek istediğine emin misin?`
    );
    if (!confirmed) return;

    setBusyTaskId(task.id);
    setErrorMessage("");

    try {
      const response = await apiRequest(`/tasks/${task.id}/`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setErrorMessage(errData.detail || "Görev silinemedi.");
        return;
      }

      setTasks((prev) => prev.filter((item) => item.id !== task.id));
      if (editingTaskId === task.id) {
        setEditingTaskId(null);
      }
    } catch {
      setErrorMessage("Silme işlemi sırasında sunucuya bağlanılamadı.");
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <MainLayout>
      <div className="tasks-container">
        {/* Üst Başlık */}
        <div className="tasks-header">
          <h1>Görevler</h1>
          {!isLoading && <span className="tasks-count">{tasks.length} Görev</span>}
        </div>

        {/* Arama, Durum Filtresi ve Sıralama Çubuğu */}
        <div className="tasks-filter-panel" style={{ padding: "14px 18px" }}>
          <div className="task-edit-grid">
            <div className="task-edit-field">
              <label>Ara (Başlık / Açıklama)</label>
              <input
                type="text"
                placeholder="Görev ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="task-edit-field">
              <label>Durum</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tümü</option>
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </div>

            <div className="task-edit-field">
              <label>Sırala</label>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
              >
                <option value="-created_at">En Yeni</option>
                <option value="created_at">En Eski</option>
                <option value="due_date">Bitiş Tarihi (Yakın)</option>
                <option value="-due_date">Bitiş Tarihi (Uzak)</option>
                <option value="title">Başlık (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hata mesajı */}
        {errorMessage && (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        )}

        {/* Yüklenme durumu */}
        {isLoading && <p>Görevler yükleniyor...</p>}

        {/* Boş liste durumu */}
        {!isLoading && !errorMessage && tasks.length === 0 && (
          <div className="task-card">
            <p style={{ margin: 0, color: "#cbd5e1" }}>
              Henüz görüntülenecek bir görev bulunmuyor.
            </p>
          </div>
        )}

        {/* Detaylı Görev Kartları */}
        {!isLoading && tasks.length > 0 && (
          <ul className="task-list">
            {tasks.map((task) => {
              const isEditing = editingTaskId === task.id;
              const isBusy = busyTaskId === task.id;
              const canEdit = isTaskOwner(task);

              return (
                <li key={task.id} className="task-card">
                  {isEditing ? (
                    /* --- KART İÇİ DÜZENLEME FORMU --- */
                    <form
                      className="task-edit-form"
                      onSubmit={(e) => handleSaveEdit(e, task.id)}
                    >
                      <div className="task-edit-field">
                        <label>Başlık</label>
                        <input
                          type="text"
                          required
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                        />
                      </div>

                      <div className="task-edit-field">
                        <label>Açıklama</label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                        />
                      </div>

                      <div className="task-edit-grid">
                        <div className="task-edit-field">
                          <label>Durum</label>
                          <select
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm({ ...editForm, status: e.target.value })
                            }
                          >
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="DONE">DONE</option>
                          </select>
                        </div>

                        <div className="task-edit-field">
                          <label>Öncelik</label>
                          <select
                            value={editForm.priority}
                            onChange={(e) =>
                              setEditForm({ ...editForm, priority: e.target.value })
                            }
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                          </select>
                        </div>

                        <div className="task-edit-field">
                          <label>Bitiş Tarihi</label>
                          <input
                            type="date"
                            value={editForm.due_date}
                            onChange={(e) =>
                              setEditForm({ ...editForm, due_date: e.target.value })
                            }
                          />
                        </div>

                        <div className="task-edit-field">
                          <label>Kategori</label>
                          <select
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm({ ...editForm, category: e.target.value })
                            }
                          >
                            <option value="">Kategorisiz</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="task-edit-footer">
                        <button
                          type="button"
                          className="task-btn-sm task-btn-cancel"
                          onClick={cancelEditing}
                          disabled={isBusy}
                        >
                          İptal
                        </button>
                        <button
                          type="submit"
                          className="task-btn-sm task-btn-save"
                          disabled={isBusy}
                        >
                          {isBusy ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* --- KART DETAY GÖRÜNÜMÜ --- */
                    <>
                      <div className="task-card-top">
                        <div className="task-title-group">
                          <h2 className="task-title">{task.title}</h2>

                          {/* Durum, Öncelik ve Kategori rozetleri */}
                          <div className="task-badges">
                            {task.status && (
                              <span className="task-badge badge-status">
                                {task.status}
                              </span>
                            )}
                            {task.priority && (
                              <span className="task-badge badge-priority">
                                Öncelik: {task.priority}
                              </span>
                            )}
                            <span className="task-badge badge-category">
                              {task.category_name || "Kategorisiz"}
                            </span>
                          </div>
                        </div>

                        {/* Küçük Düzenle (sadece sahip için) ve Sil butonları */}
                        <div className="task-actions">
                          {canEdit && (
                            <button
                              type="button"
                              className="task-btn-sm task-btn-edit"
                              onClick={() => startEditing(task)}
                              disabled={isBusy}
                            >
                              Düzenle
                            </button>
                          )}
                          <button
                            type="button"
                            className="task-btn-sm task-btn-delete"
                            onClick={() => handleDeleteTask(task)}
                            disabled={isBusy}
                          >
                            {isBusy ? "..." : "Sil"}
                          </button>
                        </div>
                      </div>

                      {/* Açıklama alanı */}
                      <p className="task-description">
                        {task.description?.trim()
                          ? task.description
                          : "Açıklama eklenmemiş."}
                      </p>

                      {/* Tarih ve atanan kişiler bilgisi */}
                      <div className="task-meta">
                        <span>
                          <strong>Bitiş Tarihi:</strong> {formatDate(task.due_date)}
                        </span>
                        <span>
                          <strong>Oluşturulma:</strong> {formatDate(task.created_at)}
                        </span>
                        {Array.isArray(task.assigned_to_usernames) &&
                          task.assigned_to_usernames.length > 0 && (
                            <span>
                              <strong>Atananlar:</strong>{" "}
                              {task.assigned_to_usernames.join(", ")}
                            </span>
                          )}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </MainLayout>
  );
}