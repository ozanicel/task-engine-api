// Kullanıcının girdiği username ve password değerlerini tutmak için useState hook'unu içe aktarıyoruz
import { useState } from "react";
// Sayfalar arası geçiş için Link ve useNavigate araçlarını alıyoruz
import { Link, useNavigate } from "react-router-dom";
// Ortak API yardımcısı ve token kaydetme fonksiyonunu içe aktarıyoruz
import { apiRequest, setTokens } from "../api/client";
// Kayıt ve doğrulama sayfalarıyla aynı görsel dili kullanmak için ortak auth stilini içe aktarıyoruz
import "../styles/auth.css";

export default function LoginPage() {
  // Kullanıcı adı input'unun anlık değerini tutan state
  const [username, setUsername] = useState("");
  // Şifre input'unun anlık değerini tutan state
  const [password, setPassword] = useState("");
  // Giriş başarısız olursa ekranda gösterilecek hata mesajını tutan state
  const [errorMessage, setErrorMessage] = useState("");
  // İstek gönderilirken butonu kilitlemek ve "Giriş yapılıyor..." yazmak için state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Giriş başarılı olunca kullanıcıyı /tasks sayfasına yönlendirmek için hook
  const navigate = useNavigate();

  // Form gönderildiğinde çalışan asenkron fonksiyon
  async function handleSubmit(event) {
    // Sayfanın otomatik yenilenmesini engelliyoruz
    event.preventDefault();
    // Yeni deneme başlarken eski hata mesajını temizliyoruz
    setErrorMessage("");
    // Yükleniyor durumunu açıyoruz
    setIsSubmitting(true);

    try {
      // Backend'deki JWT token endpoint'ine POST isteği atıyoruz
      const response = await apiRequest("/token/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      // Yanıtı JSON'a çeviriyoruz; geçersiz JSON gelirse boş obje dönerek hatayı önlüyoruz
      const data = await response.json().catch(() => ({}));

      // HTTP durumu başarısızsa veya access token yoksa hata mesajı gösteriyoruz
      if (!response.ok || !data.access) {
        setErrorMessage(data.detail || "Kullanıcı adı veya şifre hatalı.");
        return;
      }

      // Access ve refresh token'ları localStorage'a kaydediyoruz
      setTokens(data.access, data.refresh);
      // Giriş yapılan kullanıcı adını Navbar'da gösterebilmek için kaydediyoruz
      if (username.trim()) {
        localStorage.setItem("username", username.trim());
      }
      // Başarılı giriş sonrası /tasks ekranına geçiyoruz
      navigate("/tasks");
    } catch {
      // Sunucuya ulaşılamadığında veya ağ/CORS hatasında kullanıcıya bilgi veriyoruz
      setErrorMessage("Sunucuya bağlanılamadı.");
    } finally {
      // İstek bitince butonu tekrar aktif hale getiriyoruz
      setIsSubmitting(false);
    }
  }

  return (
    // auth.css ile tam ekran ortalanmış arka plan
    <div className="auth-page">
      {/* auth.css ile şık koyu kart görünümü */}
      <div className="auth-card">
        <h1>Giriş Yap</h1>

        {/* Form gönderildiğinde handleSubmit tetiklenir */}
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* errorMessage doluysa uyarı kutusunu gösteriyoruz */}
          {errorMessage && (
            <p className="auth-error" role="alert">
              {errorMessage}
            </p>
          )}

          {/* isSubmitting true iken buton pasif kalır */}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {/* Kayıt sayfasına geçiş bağlantısı */}
        <p className="auth-footer">
          Hesabın yok mu? <Link to="/register">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
}