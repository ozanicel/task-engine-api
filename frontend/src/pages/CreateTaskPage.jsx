// Yeni görev formu, kategori/arkadaş seçenekleri ve gönderim durumunu yönetmek için hook'ları alıyoruz
import { useEffect, useState } from "react";
// Görev oluşturulduktan sonra /tasks listesine dönmek ve 401'de /login'e gitmek için useNavigate kullanıyoruz
import { useNavigate } from "react-router-dom";
// localStorage'daki access_token'ı otomatik Bearer header olarak ekleyen ortak API yardımcısı
import { apiRequest } from "../api/client";
// Üst Navbar ve sol Sidebar'ı bir arada sunan ortak yerleşim kabuğu
import MainLayout from "../components/MainLayout";
// Ortak hata ve form stilleri + görev formu grid stilleri
import "../styles/auth.css";
import "../styles/tasks.css";

export default function CreateTaskPage() {
  // TaskSerializer ile uyumlu form alanları
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [manualUsernames, setManualUsernames] = useState("");

  // Seçim kutuları için backend'den çekilen listeler
  const [categories, setCategories] = useState([]);
  const [friendUsernames, setFriendUsernames] = useState([]);

  // İstek durumu ve geri bildirim mesajları
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  // Sayfa açıldığında kategori ve arkadaş seçeneklerini getirmeye çalışıyoruz
  useEffect(() => {
    async function loadFormOptions() {
      try {
        const [categoriesRes, friendsRes] = await Promise.all([
          apiRequest("/categories/", { method: "GET" }).catch(() => null),
          apiRequest("/friends/", { method: "GET" }).catch(() => null),
        ]);

        if (categoriesRes && categoriesRes.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        if (categoriesRes && categoriesRes.ok) {
          const catData = await categoriesRes.json().catch(() => []);
          const catList = Array.isArray(catData) ? catData : catData.results || [];
          setCategories(catList);
        }

        if (friendsRes && friendsRes.ok) {
          const friendData = await friendsRes.json().catch(() => []);
          const rawList = Array.isArray(friendData)
            ? friendData
            : friendData.results || [];

          // Farklı serializer şekillerine karşı kullanıcı adını güvenli şekilde ayıklıyoruz
          const extractedNames = rawList
            .map((item) => {
              if (typeof item === "string") return item;
              if (item.username) return item.username;
              if (item.friend_username) return item.friend_username;
              if (item.to_user_username) return item.to_user_username;
              if (item.sender_username && item.receiver_username) {
                return `${item.sender_username} / ${item.receiver_username}`;
              }
              return null;
            })
            .filter(Boolean);

          setFriendUsernames(extractedNames);
        }
      } catch {
        // Seçenek endpoint'leri henüz hazır değilse form yine de çalışır
      }
    }

    loadFormOptions();
  }, [navigate]);

  // Çoklu arkadaş seçim kutusundan seçilen kullanıcı adlarını günceller
  function handleFriendSelectionChange(e) {
    const chosen = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setSelectedFriends(chosen);
  }

  // Yeni görevi POST /tasks/ isteğiyle backend'e gönderir
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("Görev başlığı zorunludur.");
      return;
    }

    // Seçili arkadaşlarla manuel girilen kullanıcı adlarını birleştirip tekilleştiriyoruz
    const extraUsernames = manualUsernames
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    const assignedList = Array.from(
      new Set([...selectedFriends, ...extraUsernames])
    );

    // TaskSerializer'ın beklediği payload yapısını hazırlıyoruz
    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date: dueDate || null,
      category: categoryId === "" ? null : Number(categoryId),
      assigned_to_usernames: assignedList,
    };

    setIsSubmitting(true);

    try {
      const response = await apiRequest("/tasks/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // DRF validation hatalarını okunabilir metne çeviriyoruz
        const firstFieldError =
          typeof data === "object" && data !== null
            ? Object.values(data).flat()[0]
            : null;
        setErrorMessage(
          data.detail ||
            (typeof firstFieldError === "string"
              ? firstFieldError
              : "Görev oluşturulurken bir hata oluştu.")
        );
        return;
      }

      // Başarılı oluşturma sonrası görevler listesine yönlendiriyoruz
      navigate("/tasks", { replace: true });
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className="tasks-container">
        {/* Sayfa Başlığı */}
        <div className="tasks-header">
          <h1>Yeni Görev Oluştur</h1>
          <button
            type="button"
            className="task-btn-sm task-btn-cancel"
            onClick={() => navigate("/tasks")}
          >
            Görevlere Dön
          </button>
        </div>

        {/* Görev Oluşturma Kartı */}
        <div className="task-card">
          {errorMessage && (
            <p className="auth-error" role="alert">
              {errorMessage}
            </p>
          )}

          <form className="task-edit-form" onSubmit={handleSubmit}>
            <div className="task-edit-field">
              <label htmlFor="task-title">Başlık *</label>
              <input
                id="task-title"
                type="text"
                required
                placeholder="Örn: API dokümantasyonunu tamamla"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="task-edit-field">
              <label htmlFor="task-description">Açıklama</label>
              <textarea
                id="task-description"
                rows={4}
                placeholder="Görev detaylarını veya notları yaz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="task-edit-grid">
              <div className="task-edit-field">
                <label htmlFor="task-status">Durum</label>
                <select
                  id="task-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="DONE">DONE</option>
                </select>
              </div>

              <div className="task-edit-field">
                <label htmlFor="task-priority">Öncelik</label>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div className="task-edit-field">
                <label htmlFor="task-due-date">Bitiş Tarihi</label>
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="task-edit-field">
                <label htmlFor="task-category">Kategori</label>
                <select
                  id="task-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
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

            {/* Arkadaş atama alanı (assigned_to_usernames) */}
            <div className="task-edit-grid">
              {friendUsernames.length > 0 && (
                <div className="task-edit-field">
                  <label htmlFor="task-assigned-friends">
                    Atanan Arkadaşlar (Ctrl/Cmd ile çoklu seç)
                  </label>
                  <select
                    id="task-assigned-friends"
                    multiple
                    value={selectedFriends}
                    onChange={handleFriendSelectionChange}
                    style={{ minHeight: "76px" }}
                  >
                    {friendUsernames.map((uname) => (
                      <option key={uname} value={uname}>
                        {uname}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="task-edit-field">
                <label htmlFor="task-assigned-manual">
                  Atanan Kullanıcı Adları (Virgülle ayır)
                </label>
                <input
                  id="task-assigned-manual"
                  type="text"
                  placeholder="Örn: ali_yilmaz, ayse_kaya"
                  value={manualUsernames}
                  onChange={(e) => setManualUsernames(e.target.value)}
                />
              </div>
            </div>

            <div className="task-edit-footer">
              <button
                type="button"
                className="task-btn-sm task-btn-cancel"
                onClick={() => navigate("/tasks")}
                disabled={isSubmitting}
              >
                İptal
              </button>
              <button
                type="submit"
                className="task-btn-sm task-btn-save"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Oluşturuluyor..." : "Görevi Oluştur"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}