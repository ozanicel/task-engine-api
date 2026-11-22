// Form ve doğrulama kodu durumlarını yönetmek için useState hook'unu içe aktarıyoruz
import { useState } from "react";
// Yönlendirme verisini (state) okumak için useLocation, sayfa geçişi için useNavigate ve Link alıyoruz
import { useLocation, useNavigate, Link } from "react-router-dom";
// Ortak API temel adresini içe aktarıyoruz
import { API_BASE_URL } from "../api/client";
// Login ve Register sayfalarıyla aynı görsel tasarımı kullanmak için auth.css'i dahil ediyoruz
import "../styles/auth.css";

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // RegisterPage'den yönlendirilirken e-posta geldiyse başlangıç değeri olarak alıyoruz
  const initialEmail = location.state?.email || "";

  // E-posta, OTP kodu, hata mesajı ve gönderim durumu için state'ler
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doğrulama formunu gönderen asenkron fonksiyon
  async function handleVerify(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      // API_BASE_URL zaten /api içerdiği için doğrudan /verify-otp/ endpoint'ine istek atıyoruz
      const response = await fetch(`${API_BASE_URL}/verify-otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(
          data.detail ||
            data.otp?.[0] ||
            "Doğrulama kodu geçersiz veya süresi dolmuş."
        );
        return;
      }

      // Doğrulama başarılı olunca giriş sayfasına yönlendiriyoruz
      navigate("/login", {
        state: { verified: true, email: email.trim() },
      });
    } catch {
      setErrorMessage("Sunucuya bağlanılamadı. Lütfen tekrar dene.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Hesap Doğrulama</h1>

        <form onSubmit={handleVerify}>
          <div className="auth-field">
            <label htmlFor="otpEmail">E-posta</label>
            <input
              id="otpEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="otpCode">Doğrulama Kodu</label>
            <input
              id="otpCode"
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
            />
          </div>

          {errorMessage && (
            <p className="auth-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Doğrulanıyor..." : "Doğrula"}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Giriş ekranına dön</Link>
        </p>
      </div>
    </div>
  );
}