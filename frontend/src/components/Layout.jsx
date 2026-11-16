import Header from './Header';

const Layout = ({ children }) => (
  <div className="app paper">
    <Header />
    {children}
  </div>
);

export default Layout;
