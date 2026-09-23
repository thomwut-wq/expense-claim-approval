import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ระบบอนุมัติค่าใช้จ่าย | Expense Claim Approval",
    template: "%s | Expense Claim Approval",
  },
  description: "ระบบยื่นและอนุมัติเบิกค่าใช้จ่ายสำหรับทีมการเงิน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ className: "font-sans", duration: 3500 }}
        />
      </body>
    </html>
  );
}
