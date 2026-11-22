// Aktif kullanıcı adını saklamak ve depolama değişikliklerini dinlemek için hook'ları alıyoruz
import { useEffect, useState } from "react";
// Çıkış sonrası kullanıcıyı /login sayfasına yönlendirmek için useNavigate hook'unu alıyoruz
import { useNavigate } from "react-router-dom";
// Üst bar stillerini içe aktarıyoruz
import "../styles/navbar.css";

// JWT token payload'ından username veya user_id bilgisini okumaya çalışır
function extractFromToken() {
  const token =
    localStorage.getItem("access_token") || localStorage.getItem("access");
  if (!token || token.split(".").length !== 3) return "";

  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return decoded.username || decoded.user_username || "";
  } catch {
    return "";
  }
}

// localStorage içinden kayıtlı kullanıcı adını alır
function readUsername() {
  const saved = localStorage.getItem("username");
  if (saved && saved.trim()) return saved.trim();

  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.username) return String(parsed.username);
    }
  } catch {
    // JSON parse hatası olursa yok sayıyoruz
  }

  return extractFromToken();
}

export default function Navbar() {
  const [username, setUsername] = useState(() => readUsername());
  const navigate = useNavigate();

  // Sayfa yüklendiğinde veya başka sekmede/oturumda username güncellendiğinde state'i senkronize eder
  useEffect(() => {
    setUsername(readUsername());

    function handleStorageChange() {
      setUsername(readUsername());
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Logout butonuna basıldığında kayıtlı oturum verilerini temizleyip /login sayfasına yönlendirir
  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  }

  return (
    <header className="top-navbar">
      {/* En solda uygulama başlığı */}
      <span className="navbar-brand">Task Engine</span>

      {/* Sağda: Logout'un hemen solunda username, en sağda Logout butonu */}
      <div className="navbar-right">
        <span className="navbar-username" title="Aktif hesap">
          {username || "User"}
        </span>

        <button
          type="button"
          className="navbar-logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}