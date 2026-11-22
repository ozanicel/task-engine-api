// Form ve istek durumlarını yönetmek için useState hook'unu içe aktarıyoruz
import { useState } from "react";
// Sayfalar arası geçişler için Link ve useNavigate hook'larını alıyoruz
import { Link, useNavigate } from "react-router-dom";
// Ortak API temel adresini içe aktarıyoruz
import { API_BASE_URL } from "../api/client";
// Login ve VerifyOtp sayfalarıyla aynı görsel tasarımı kullanmak için auth.css'i dahil ediyoruz
import "../styles/auth.css";

export default function RegisterPage() {
  // Kullanıcı girişleri için state'ler
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Hata mesajı ve gönderim durumu için state'ler
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kayıt tamamlanınca /verify-otp sayfasına yönlendirmek için hook
  const navigate = useNavigate();

  // Backend'den dönen farklı formattaki hata yanıtlarını okunabilir tek metne çevirir
  function formatBackendErrors(data, status) {
    const messages = [];

    if (typeof data.detail === "string") {
      messages.push(data.detail);
    }
    if (typeof data.message === "string") {
      messages.push(data.message);
    }
    if (typeof data.error === "string") {
      messages.push(data.error);
    }

    for (const [field, value] of Object.entries(data)) {
      if (["detail", "message", "error"].includes(field)) continue;

      if (Array.isArray(value)) {
        messages.push(`${field}: ${value.join(" ")}`);
      } else if (typeof value === "string") {
        messages.push(`${field}: ${value}`);
      } else if (value && typeof value === "object") {
        messages.push(`${field}: ${JSON.stringify(value)}`);
      }
    }

    return messages.length > 0
      ? messages.join(" | ")
      : `Kayıt işlemi başarısız oldu (HTTP ${status}).`;
  }

  // Kayıt formu gönderildiğinde çalışan asenkron fonksiyon
  async function handleSubmit(event) {
    // Sayfanın varsayılan yenileme davranışını engelliyoruz
    event.preventDefault();
    // Önceki hata mesajını temizliyoruz
    setErrorMessage("");

    // Göndermeden önce şifrelerin aynı olup olmadığını kontrol ediyoruz
    if (password !== passwordConfirm) {
      setErrorMessage("Şifreler birbirleriyle uyuşmuyor.");
      return;
    }

    setIsSubmitting(true);

    try {
      // API_BASE_URL zaten /api içerdiği için /register/ endpoint'ine POST isteği atıyoruz
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      // Gelen yanıtı JSON'a çeviriyoruz; geçerli JSON değilse boş obje dönüyoruz
      const data = await response.json().catch(() => ({}));

      // HTTP durumu başarısızsa backend'in verdiği gerçek nedeni ekrana yazdırıyoruz
      if (!response.ok) {
        setErrorMessage(formatBackendErrors(data, response.status));
        return;
      }

      // Kayıt başarılıysa OTP doğrulama sayfasına e-posta ve kullanıcı adıyla yönlendiriyoruz
      navigate("/verify-otp", {
        state: {
          email: email.trim(),
          username: username.trim(),
        },
      });
    } catch {
      // Sunucuya hiç ulaşılamazsa ağ hatası mesajı gösteriyoruz
      setErrorMessage("Sunucuya bağlanılamadı. Lütfen tekrar dene.");
    } finally {
      // İstek bittiğinde butonu tekrar aktif hale getiriyoruz
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Kayıt Ol</h1>

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
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <div className="auth-field">
            <label htmlFor="passwordConfirm">Şifre Tekrar</label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>

          {errorMessage && (
            <p className="auth-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="auth-footer">
          Zaten hesabın var mı? <Link to="/login">Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}