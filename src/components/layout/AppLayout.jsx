import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import MobileNav from './MobileNav.jsx';

function AppLayout() {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main-content" id="main-content">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

export default AppLayout;
