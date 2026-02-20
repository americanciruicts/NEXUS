'use client';

import { Toaster } from 'sonner';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={5000}
      expand={true}
      visibleToasts={5}
    />
  );
}
