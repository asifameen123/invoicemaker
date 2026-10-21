import React from 'react';

export default function Input({ label, rightLabel, className = '', disabled, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      {(label || rightLabel) && (
        <div className="flex justify-between items-center">
          {label && <label>{label}</label>}
          {rightLabel && <div>{rightLabel}</div>}
        </div>
      )}
      <input
        disabled={disabled}
        className={`${className} ${
          disabled ? '!bg-slate-100 !text-slate-500 !cursor-not-allowed !border-slate-200' : ''
        }`}
        {...props}
      />
    </div>
  );
}

