// Kategori listesi, yeni ekleme formu ve düzenleme/silme durumlarını yönetmek için hook'ları alıyoruz
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

export default function CategoriesPage() {
  // Backend'den gelen kategori listesi
  const [categories, setCategories] = useState([]);

  // Yeni kategori ekleme formu state'leri
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Mevcut kategori adını düzenleme state'leri
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingName, setEditingName] = useState("");

  // İstek sürerken ilgili kategori ID'sini tutar
  const [busyCategoryId, setBusyCategoryId] = useState(null);

  // Yüklenme ve hata/bilgi mesajları
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  // Sayfa yüklendiğinde giriş yapan kullanıcının kategorilerini çeker
  useEffect(() => {
    async function fetchCategories() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await apiRequest("/categories/", { method: "GET" });

        // Token geçersiz veya süresi dolmuşsa giriş sayfasına yönlendiriyoruz
        if (response.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        const data = await response.json().catch(() => []);
        if (!response.ok) {
          setErrorMessage(data.detail || "Kategoriler yüklenirken bir hata oluştu.");
          return;
        }

        const list = Array.isArray(data) ? data : data.results || [];
        setCategories(list);
      } catch {
        setErrorMessage("Sunucuya bağlanılamadı.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, [navigate]);

  // Yeni kategori oluşturmak için POST /categories/ isteği atar
  async function handleCreateCategory(e) {
    e.preventDefault();
    setErrorMessage("");

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setErrorMessage("Kategori adı boş bırakılamaz.");
      return;
    }

    setIsCreating(true);

    try {
      const response = await apiRequest("/categories/", {
        method: "POST",
        body: JSON.stringify({ name: trimmedName }),
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const firstErr =
          typeof data === "object" && data !== null
            ? Object.values(data).flat()[0]
            : null;
        setErrorMessage(
          data.detail ||
            (typeof firstErr === "string"
              ? firstErr
              : "Kategori eklenirken bir hata oluştu.")
        );
        return;
      }

      // Yeni kategoriyi listenin başına ekleyip formu temizliyoruz
      setCategories((prev) => [data, ...prev]);
      setNewName("");
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setIsCreating(false);
    }
  }

  // Kategori düzenleme modunu açar
  function startEditing(category) {
    setErrorMessage("");
    setEditingCategoryId(category.id);
    setEditingName(category.name || "");
  }

  // Kategori düzenleme modunu kapatır
  function cancelEditing() {
    setEditingCategoryId(null);
    setEditingName("");
  }

  // Güncellenen kategori adını PATCH /categories/<id>/ ile kaydeder
  async function handleUpdateCategory(e, categoryId) {
    e.preventDefault();
    setErrorMessage("");

    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setErrorMessage("Kategori adı boş bırakılamaz.");
      return;
    }

    setBusyCategoryId(categoryId);

    try {
      const response = await apiRequest(`/categories/${categoryId}/`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName }),
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const updated = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(updated.detail || "Kategori güncellenemedi.");
        return;
      }

      setCategories((prev) =>
        prev.map((item) => (item.id === categoryId ? updated : item))
      );
      setEditingCategoryId(null);
      setEditingName("");
    } catch {
      setErrorMessage("Güncelleme sırasında sunucuya bağlanılamadı.");
    } finally {
      setBusyCategoryId(null);
    }
  }

  // Kategoriyi DELETE /categories/<id>/ ile siler
  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(
      `"${category.name}" kategorisini silmek istediğine emin misin?`
    );
    if (!confirmed) return;

    setBusyCategoryId(category.id);
    setErrorMessage("");

    try {
      const response = await apiRequest(`/categories/${category.id}/`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setErrorMessage(errData.detail || "Kategori silinemedi.");
        return;
      }

      setCategories((prev) => prev.filter((item) => item.id !== category.id));
      if (editingCategoryId === category.id) {
        cancelEditing();
      }
    } catch {
      setErrorMessage("Silme işlemi sırasında sunucuya bağlanılamadı.");
    } finally {
      setBusyCategoryId(null);
    }
  }

  return (
    <MainLayout>
      <div className="tasks-container">
        {/* Üst Başlık */}
        <div className="tasks-header">
          <h1>Kategoriler</h1>
          {!isLoading && (
            <span className="tasks-count">{categories.length} Kategori</span>
          )}
        </div>

        {/* Yeni Kategori Ekleme Paneli */}
        <div className="tasks-filter-panel">
          <form
            onSubmit={handleCreateCategory}
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div className="task-edit-field" style={{ flex: 1, minWidth: "220px" }}>
              <label htmlFor="new-category-name">Yeni Kategori Adı</label>
              <input
                id="new-category-name"
                type="text"
                placeholder="Örn: Backend, Dersler, Kişisel..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="task-btn-sm task-btn-save"
              style={{ padding: "9px 16px", fontSize: "0.86rem" }}
              disabled={isCreating}
            >
              {isCreating ? "Ekleniyor..." : "Kategori Ekle"}
            </button>
          </form>
        </div>

        {/* Hata mesajı */}
        {errorMessage && (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        )}

        {/* Yüklenme durumu */}
        {isLoading && <p>Kategoriler yükleniyor...</p>}

        {/* Boş liste durumu */}
        {!isLoading && !errorMessage && categories.length === 0 && (
          <div className="task-card">
            <p style={{ margin: 0, color: "#cbd5e1" }}>
              Henüz bir kategori oluşturmadın. Yukarıdaki alandan ilk kategorini ekleyebilirsin.
            </p>
          </div>
        )}

        {/* Kategori Listesi */}
        {!isLoading && categories.length > 0 && (
          <ul className="task-list">
            {categories.map((category) => {
              const isEditing = editingCategoryId === category.id;
              const isBusy = busyCategoryId === category.id;

              return (
                <li key={category.id} className="task-card">
                  {isEditing ? (
                    <form
                      className="task-edit-form"
                      onSubmit={(e) => handleUpdateCategory(e, category.id)}
                    >
                      <div className="task-edit-field">
                        <label>Kategori Adı</label>
                        <input
                          type="text"
                          required
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                        />
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
                    <div className="task-card-top" style={{ alignItems: "center" }}>
                      <div className="task-title-group">
                        <h2 className="task-title">{category.name}</h2>
                        <div className="task-badges">
                          <span className="task-badge badge-category">
                            ID: #{category.id}
                          </span>
                        </div>
                      </div>

                      <div className="task-actions">
                        <button
                          type="button"
                          className="task-btn-sm task-btn-edit"
                          onClick={() => startEditing(category)}
                          disabled={isBusy}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className="task-btn-sm task-btn-delete"
                          onClick={() => handleDeleteCategory(category)}
                          disabled={isBusy}
                        >
                          {isBusy ? "..." : "Sil"}
                        </button>
                      </div>
                    </div>
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