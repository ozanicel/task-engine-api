// Aktif rotaya göre otomatik stil verebilmek için NavLink kullanıyoruz
import { NavLink } from "react-router-dom";
// Sidebar stillerini içe aktarıyoruz
import "../styles/layout.css";

// Sol menüde yer alacak ekranların rota ve etiket tanımları
const navItems = [
  { to: "/tasks", label: "List Tasks", end: true },
  { to: "/tasks/create", label: "Create Task", end: true },
  { to: "/categories", label: "Categories" },
  { to: "/friends", label: "Friends" },
  { to: "/proposals", label: "Proposals" },
  { to: "/notifications", label: "Notifications" },
  { to: "/profile", label: "Profile" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary Sidebar Navigation">
      <span className="sidebar-section-title">Menu</span>

      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          // /tasks aktifken /tasks/create'in de aktif görünmemesi için end desteğini kullanıyoruz
          className={({ isActive }) =>
            isActive ? "sidebar-link is-active" : "sidebar-link"
          }
        >
          {item.label}
        </NavLink>
      ))}
    </aside>
  );
}