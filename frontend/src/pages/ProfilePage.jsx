// Profil bilgisini çekme, seçilen görseli önizleme ve FormData ile yükleme için hook'lar
import { useEffect, useState } from "react";
// Yetkisiz (401) durumda /login yönlendirmesi için useNavigate
import { useNavigate } from "react-router-dom";
// Bearer token ekleyen ortak API istemcisi
import { apiRequest, API_BASE_URL } from "../api/client";
// Üst Navbar ve sol Sidebar'ı bir arada sunan ortak yerleşim kabuğu
import MainLayout from "../components/MainLayout";
// Ortak tema ve bileşen stilleri
import "../styles/auth.css";
import "../styles/tasks.css";

// Backend'den gelen göreceli veya tam medya URL'sini görüntülenebilir adrese çevirir
function resolveMediaUrl(picturePath) {
  if (!picturePath) return "";
  if (
    picturePath.startsWith("http://") ||
    picturePath.startsWith("https://") ||
    picturePath.startsWith("blob:")
  ) {
    return picturePath;
  }

  const normalizedBase = (API_BASE_URL || "http://127.0.0.1:8000/api").replace(
    /\/api\/?$/,
    ""
  );
  const normalizedPath = picturePath.startsWith("/")
    ? picturePath
    : `/${picturePath}`;

  return `${normalizedBase}${normalizedPath}`;
}

export default function ProfilePage() {
  // Backend'den gelen mevcut profil fotoğrafı yolu
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  // Kullanıcının yüklemek için seçtiği yeni dosya ve önizleme URL'si
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Yükleme, kaydetme, hata ve başarılı mesaj state'leri
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentUsername = localStorage.getItem("username") || "Kullanıcı";
  const navigate = useNavigate();

  // Mevcut profil bilgisini getirir: GET /api/profile/
  async function loadProfile(showLoader = false) {
    if (showLoader) {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const response = await apiRequest("/profile/", { method: "GET" });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(
          data.detail ||
            data.error ||
            "Profil bilgileri yüklenirken bir hata oluştu."
        );
        return;
      }

      setProfilePictureUrl(resolveMediaUrl(data.profile_picture || ""));
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    loadProfile(true);
  }, [navigate]);

  // Seçici Blob URL'si oluştuysa bellek sızıntısını önlemek için temizliyoruz
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Dosya seçildiğinde validasyon ve anlık önizleme oluşturur
  function handleFileChange(e) {
    setErrorMessage("");
    setSuccessMessage("");

    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Lütfen geçerli bir görsel dosyası seç (PNG, JPG, WEBP).");
      e.target.value = "";
      return;
    }

    // Maksimum 5 MB kontrolü
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Profil fotoğrafı boyutu 5 MB'dan küçük olmalıdır.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // Seçilen görseli FormData ile PATCH /api/profile/ endpoint'ine gönderir
  async function handleUploadProfilePicture(e) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedFile) {
      setErrorMessage("Lütfen önce yüklemek için bir profil fotoğrafı seç.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("profile_picture", selectedFile);

      const response = await apiRequest("/profile/", {
        method: "PATCH",
        body: formData,
      });

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const firstError =
          data.profile_picture?.[0] ||
          data.detail ||
          data.error ||
          "Profil fotoğrafı güncellenemedi.";
        setErrorMessage(firstError);
        return;
      }

      const updatedUrl = resolveMediaUrl(data.profile_picture || "");
      setProfilePictureUrl(updatedUrl);
      if (updatedUrl) {
        localStorage.setItem("profile_picture_url", updatedUrl);
      } else {
        localStorage.removeItem("profile_picture_url");
      }
      window.dispatchEvent(new Event("profileUpdated"));
      setSelectedFile(null);
      setPreviewUrl("");
      setSuccessMessage("Profil fotoğrafın başarıyla güncellendi.");
      await loadProfile(false);
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      setIsUploading(false);
    }
  }

  const displayedAvatar = previewUrl || profilePictureUrl;

  return (
    <MainLayout>
      <div className="tasks-container">
        {/* Üst Başlık */}
        <div className="tasks-header">
          <h1>Profil</h1>
          <span className="tasks-count">{currentUsername}</span>
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
        {isLoading && <p>Profil bilgileri yükleniyor...</p>}

        {!isLoading && (
          <div className="task-card" style={{ gap: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              {/* Profil Fotoğrafı Önizleme Alanı */}
              <div
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid rgba(212, 175, 106, 0.65)",
                  backgroundColor: "#0b1220",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {displayedAvatar ? (
                  <img
                    src={displayedAvatar}
                    alt={`${currentUsername} profil fotoğrafı`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      color: "#d4af6a",
                    }}
                  >
                    {currentUsername.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h2 className="task-title" style={{ margin: 0 }}>
                  {currentUsername}
                </h2>
                <span style={{ fontSize: "0.86rem", color: "#94a3b8" }}>
                  {previewUrl
                    ? "Yeni fotoğraf önizlemesi hazır — kaydetmek için yükle butonuna bas."
                    : profilePictureUrl
                      ? "Mevcut profil fotoğrafın aktif."
                      : "Henüz profil fotoğrafı yüklenmemiş."}
                </span>
              </div>
            </div>

            {/* Fotoğraf Yükleme Formu */}
            <form
              onSubmit={handleUploadProfilePicture}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div className="task-edit-field">
                <label htmlFor="profile-picture-input">
                  Yeni Profil Fotoğrafı Seç (PNG, JPG, WEBP — Maks. 5 MB)
                </label>
                <input
                  id="profile-picture-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div className="task-edit-actions">
                <button
                  type="submit"
                  className="task-btn-sm task-btn-save"
                  style={{ padding: "9px 16px", fontSize: "0.86rem" }}
                  disabled={isUploading || !selectedFile}
                >
                  {isUploading ? "Yükleniyor..." : "Fotoğrafı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </MainLayout>
  );
}