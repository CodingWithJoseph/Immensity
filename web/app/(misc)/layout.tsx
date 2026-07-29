import "../globals.css";
import React from "react";
import Footer from "@/components/Footer";
import NavigationBar from "@/components/NavigationBar";

export default function LegalLayout({children}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="marketing min-h-screen">
        <NavigationBar />
        {children}
        <Footer />
    </div>
  );
}
