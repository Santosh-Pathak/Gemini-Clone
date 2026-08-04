"use client";
import geminiZustand from "@/utils/gemini-zustand";
import React, { useEffect } from "react";

const DevToast = () => {
  const { devToast, toastIsError, setToast, setErrorToast } = geminiZustand();

  useEffect(() => {
    if (!devToast) return;
    const timeout = setTimeout(
      () => {
        setToast(null);
        setErrorToast(null);
      },
      toastIsError ? 5000 : 2500
    );
    return () => clearTimeout(timeout);
  }, [devToast, toastIsError, setToast, setErrorToast]);

  if (!devToast) return null;

  return (
    <div
      role="alert"
      className={`dev-toast bottom-6 left-6 text-left w-80 text-sm font-light p-3 fixed z-50 rounded shadow-lg ${
        toastIsError
          ? "bg-red-950/95 text-red-50 border border-red-500/40"
          : "dark:text-black text-white dark:bg-rtlLight bg-rtlDark"
      }`}
    >
      {devToast}
    </div>
  );
};

export default DevToast;
