import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, API_BASE_URL, clearTokens } from "../api/client";
import "../styles/navbar.css";

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

export default function Navbar() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Kullanıcı";

  const [avatarUrl, setAvatarUrl] = useState(
    () => localStorage.getItem("profile_picture_url") || ""
  );

  async function fetchProfileAvatar() {
    try {
      const response = await apiRequest("/profile/", { method: "GET" });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      const resolved = resolveMediaUrl(data.profile_picture || "");
      setAvatarUrl(resolved);
      if (resolved) {
        localStorage.setItem("profile_picture_url", resolved);
      } else {
        localStorage.removeItem("profile_picture_url");
      }
    } catch {
      // Navbar'da ağ hatası akışı bozmasın
    }
  }

  useEffect(() => {
    fetchProfileAvatar();

    const handleProfileUpdated = () => {
      const cached = localStorage.getItem("profile_picture_url") || "";
      setAvatarUrl(cached);
      fetchProfileAvatar();
    };

    window.addEventListener("profileUpdated", handleProfileUpdated);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdated);
    };
  }, []);

  function handleLogout() {
    clearTokens();
    localStorage.removeItem("username");
    localStorage.removeItem("user_id");
    localStorage.removeItem("profile_picture_url");
    navigate("/login", { replace: true });
  }

  return (
    <header
      className="navbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Link to="/tasks" className="navbar-brand">
        Task Engine
      </Link>

      <div
        className="navbar-right"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <Link
          to="/profile"
          className="navbar-profile-link"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
          title="Profili Görüntüle"
        >
          <span className="navbar-username">{username}</span>
          <span
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "1.5px solid rgba(212, 175, 106, 0.75)",
              backgroundColor: "#0b1220",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${username} profil fotoğrafı`}
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
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#d4af6a",
                }}
              >
                {username.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
        </Link>

        <button
          type="button"
          className="navbar-logout-btn"
          onClick={handleLogout}
          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          Çıkış Yap
        </button>
      </div>
    </header>
  );
}