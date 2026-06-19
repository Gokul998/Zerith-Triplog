import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-sm font-medium text-white/60">{label}</label>}
      <input
        ref={ref}
        id={id}
        className={cn("w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-indigo-500 focus:outline-none disabled:opacity-50", error && "border-red-400", className)}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
