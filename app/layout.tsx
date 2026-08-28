import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JD Soluciones Biomédicas | Tecnología para ópticas",
  description: "Mantenimiento, reparación y calibración de equipos ópticos en Colombia.",
  icons: {
    icon: "/brand/jd-soluciones-logo.png",
    shortcut: "/brand/jd-soluciones-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
