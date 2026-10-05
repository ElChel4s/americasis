import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Sistema América — Radio Service ERP",
  description: "ERP Integral para Taller de Radiocomunicación Profesional",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-100 text-gray-800`}>
        {children}
      </body>
    </html>
  );
}
