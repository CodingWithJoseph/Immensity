import "../globals.css";
import React from "react";
import Footer from "@/components/Footer";
import NavigationBar from "@/components/NavigationBar";

export default function AuthLayout({children}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
        <NavigationBar />
        {children}
        <Footer />
    </>
  );
}
