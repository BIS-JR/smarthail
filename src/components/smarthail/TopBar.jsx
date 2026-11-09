import DateTimeHeader from './DateTimeHeader';
import HamburgerMenu from './HamburgerMenu';

export default function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <DateTimeHeader />
        <HamburgerMenu />
      </div>
    </header>
  );
}
