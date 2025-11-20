"use client";

import { useState } from "react";
import { TouchButton } from "./TouchButton";

interface TouchKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  label?: string;
}

export function TouchKeyboard({
  value,
  onChange,
  onConfirm,
  onCancel,
  placeholder = "",
  label,
}: TouchKeyboardProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleKeyPress = (key: string) => {
    if (key === "backspace") {
      onChange(value.slice(0, -1));
    } else if (key === "clear") {
      onChange("");
    } else {
      onChange(value + key);
    }
  };

  if (!isVisible) {
    return (
      <div>
        {label && <label className="block text-lg font-medium mb-3">{label}</label>}
        <input
          type="text"
          value={value}
          readOnly
          placeholder={placeholder}
          onClick={() => setIsVisible(true)}
          className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px] cursor-pointer"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {label && <label className="block text-lg font-medium">{label}</label>}
      <input
        type="text"
        value={value}
        readOnly
        placeholder={placeholder}
        className="w-full px-6 py-5 bg-background border-2 border-primary rounded-xl text-xl font-semibold focus:outline-none min-h-[64px]"
      />

      <div className="bg-card border border-border rounded-xl p-4">
        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchButton
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              size="lg"
              className="aspect-square"
            >
              {num}
            </TouchButton>
          ))}
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-4 gap-3">
          <TouchButton
            onClick={() => handleKeyPress("backspace")}
            variant="secondary"
            size="lg"
            className="col-span-2"
          >
            ⌫ Borrar
          </TouchButton>
          <TouchButton
            onClick={() => handleKeyPress("0")}
            size="lg"
            className="aspect-square"
          >
            0
          </TouchButton>
          <TouchButton
            onClick={() => {
              onChange("");
              setIsVisible(false);
            }}
            variant="danger"
            size="lg"
            className="aspect-square"
          >
            ✕
          </TouchButton>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {onCancel && (
            <TouchButton
              onClick={() => {
                setIsVisible(false);
                onCancel();
              }}
              variant="secondary"
              size="md"
            >
              Cancelar
            </TouchButton>
          )}
          {onConfirm && (
            <TouchButton
              onClick={() => {
                setIsVisible(false);
                onConfirm();
              }}
              variant="success"
              size="md"
            >
              Confirmar
            </TouchButton>
          )}
        </div>
      </div>
    </div>
  );
}
