// En üstteki sabit gezinme çubuğu
import Navbar from "./Navbar";
// Sol menü bileşeni
import Sidebar from "./Sidebar";
// Ortak yerleşim stilleri
import "../styles/layout.css";

export default function MainLayout({ children }) {
  return (
    <div className="app-shell">
      {/* En üstte sabit duran Task Engine + Logout çubuğu */}
      <Navbar />

      {/* Alt kısımda sol menü ve sağ ana içerik alanı */}
      <div className="app-body">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}