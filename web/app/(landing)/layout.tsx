import "../globals.css";
import "./marketing.css";
import React from "react";
import NavigationBar from "@/components/NavigationBar";
import Footer from "@/components/Footer";

export default function LandingLayout({children}: Readonly<{
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
