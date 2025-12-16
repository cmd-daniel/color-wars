// pages/_app.tsx
import { Toaster as DefaultToaster } from "@/components/ui/sonner";

export default function Toaster() {
  return (
    <>
      <DefaultToaster position="top-right" />
      <DefaultToaster id="center" position="top-center" />
    </>
  );
}
