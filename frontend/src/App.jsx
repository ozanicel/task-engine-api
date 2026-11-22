// URL yollarına göre hangi sayfanın gösterileceğini yönetmek için Router bileşenlerini alıyoruz
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
// Az önce oluşturduğumuz LoginPage bileşenini içe aktarıyoruz
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import TasksPage from "./pages/TasksPage";
import CreateTaskPage from "./pages/CreateTaskPage";
import CategoriesPage from "./pages/CategoriesPage";
import FriendsPage from "./pages/FriendsPage";
import ProposalsPage from "./pages/ProposalsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";

// Giriş yaptıktan sonra geçici olarak göreceğimiz yer tutucu bileşen (ileride asıl panel gelecek)
function PlaceholderDashboard() {
  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif" }}>
      <h2>Giriş Başarılı!</h2>
      <p>JWT token kaydedildi. Sıradaki adımlarda kayıt, doğrulama ve sol paneli ekleyeceğiz.</p>
    </div>
  );
}

export default function App() {
  return (
    // Tarayıcı adres çubuğunu (history API) dinleyen ana router sarmalayıcısı
    <BrowserRouter>
      {/* Tanımlı Route'lar arasında eşleşen ilk sayfayı render eden alan */}
      <Routes>
        {/* /login adresine gidildiğinde LoginPage açılır */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/create" element={<CreateTaskPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        


        {/* /tasks adresine gidildiğinde geçici panel görünür */}
        <Route path="/tasks" element={<PlaceholderDashboard />} />
        {/* Yukarıdakiler dışında bilinmeyen bir yol girilirse /login'e yönlendirir */}
        <Route path="*" element={<Navigate to="/login" replace />} />

        
        
      </Routes>
    </BrowserRouter>
  );
}