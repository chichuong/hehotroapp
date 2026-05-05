import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col xl:flex-row bg-gray-50">
      <Header />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
