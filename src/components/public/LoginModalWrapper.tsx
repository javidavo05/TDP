"use client";

import { Suspense } from "react";
import { LoginModal } from "./LoginModal";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

function LoginModalContent({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(isOpen);

  useEffect(() => {
    if (searchParams.get("login") === "true") {
      setModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen]);

  return <LoginModal isOpen={modalOpen} onClose={() => { setModalOpen(false); onClose(); }} />;
}

export function LoginModalWrapper({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Suspense fallback={null}>
      <LoginModalContent isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
}

